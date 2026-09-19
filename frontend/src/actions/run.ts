/**
 * @file run.ts
 * @description Server Action 的公共管线：结果契约、失败收敛、限流守卫，以及「鉴权 → 变更 → 缓存失效」执行骨架。
 *
 * 本文件**刻意不是** `'use server'` 模块：`'use server'` 文件只允许导出 async 函数，
 * 而这里要导出结果类型与 `toFailure` 这类同步工具，因此拆成普通模块供各 Action 文件引用。
 * （改写成 `'use server'` 会直接构建报错，不要「顺手统一」。）
 */
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getAuthPayload } from '@/services/auth/load';
import { invalidateBlogCache } from '@/server/cache';
import { getClientIp, isRateLimited } from '@my-app/backend/utils/rate-limit';
import { RateLimitError, UnauthorizedError, isAppError } from '@my-app/backend/errors';
import { logger } from '@my-app/backend/utils/logger';
import { routing } from '@/i18n/routing';
import type { RateLimitPolicy } from '@/server/rate-limit-policy';
import type { AuthPayload, ValidationErrorDetail } from '@my-app/shared';

/**
 * 写操作结果：成功携带数据，失败携带与 HTTP 接口同构的状态码/文案/校验明细。
 *
 * 不靠 throw 传错误：Server Action 抛出的异常在生产构建下会被 Next 抹掉 message（只留 digest），
 * 无法还原成表单级提示；返回值会原样序列化给客户端，因此这里显式承载错误信息。
 *
 * @template T 成功时的数据类型
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      /** HTTP 语义的状态码，供客户端还原 ApiRequestError */
      ok: false;
      status: number;
      message: string;
      details?: ValidationErrorDetail[];
    };

/** 失败分支的类型别名，供内部函数标注返回值 */
type ActionFailure = Extract<ActionResult<never>, { ok: false }>;

/**
 * 失效本次变更影响的页面路径（route 文件结构，非浏览器 URL；/[locale] 为动态段，故需 type）
 * 首页与列表页都由文章派生，必须一起失效；带 postId 时再失效「该篇」详情页
 */
function revalidateBlogPages(postId?: string): void {
  revalidatePath('/[locale]', 'page');
  revalidatePath('/[locale]/posts', 'page');
  // 详情页只失效这一篇：写成 /[locale]/posts/[id] 属「路由级」失效，会把全站每篇详情页的 Client Cache
  // 一起作废（改一篇 = 全站详情页回源）。展开成各语言下的具体路径，命中范围收回单篇。
  // 注意：服务端 Data Cache 目前只有列表级粒度（invalidateBlogCache 无条件失效 posts），
  // 因此这里展开具体路径换来的精度只作用于 Client Cache。详见 services/blog/load.ts 的说明。
  if (postId) {
    for (const locale of routing.locales) revalidatePath(`/${locale}/posts/${postId}`);
  }
}

/**
 * 把异常收敛为可序列化的失败结果（口径与 sendError 对齐）
 * @param err 捕获到的任意异常
 * @returns 失败结果；非 AppError 一律按 500 处理且不回传内部信息
 */
export function toFailure(err: unknown): ActionFailure {
  if (!isAppError(err)) {
    logger.error(err instanceof Error ? err.message : 'Server Action 未知错误', {
      stack: err instanceof Error ? err.stack : undefined,
    });
    return { ok: false, status: 500, message: '服务器内部错误，请稍后重试' };
  }

  if (err.statusCode >= 500) {
    logger.error(err.message, { code: err.code, statusCode: err.statusCode });
    return { ok: false, status: err.statusCode, message: '服务器内部错误，请稍后重试' };
  }

  // 4xx 的 message 是面向用户的业务提示原样透传；details 由 formatZodIssues 产出，结构即 ValidationErrorDetail
  return {
    ok: false,
    status: err.statusCode,
    message: err.message,
    details: err.details as ValidationErrorDetail[] | undefined,
  };
}

/**
 * 取访客 IP 用于限流：Server Action 无 NextRequest，但可从当前请求的 headers 读转发头
 * @returns 客户端 IP，缺失时为 'unknown'
 */
async function clientIp(): Promise<string> {
  return getClientIp({ headers: await headers() });
}

/**
 * 限流守卫：同一条入口同时存在 HTTP 路由与 Server Action 时，两侧都过这里，保证共用同一计数键与文案。
 *
 * Server Action 是可直接 POST 的公开入口，不能把它当作「只有 UI 能调」而省略频次保护。
 * @param policy 限流策略，取自 rate-limit-policy 的单一真源
 * @returns 触发限流时返回可直接 return 的失败结果；未超限返回 null
 */
export async function rateLimitFailure(policy: RateLimitPolicy): Promise<ActionFailure | null> {
  const limited = await isRateLimited(
    `${policy.key}:${await clientIp()}`,
    policy.limit,
    policy.windowMs,
  );
  return limited ? toFailure(new RateLimitError(policy.message)) : null;
}

/**
 * 执行一次受控变更：统一鉴权 → 变更 → 缓存失效，失败统一转 toFailure
 * @param mutate 实际变更逻辑，接收当前登录载荷；返回数据与需要精确失效 Client Cache 的详情页文章 id（可选，缺省表示列表级变更）
 * @returns 成功/失败的判别联合结果
 * @template T 变更返回的数据类型
 */
export async function runMutation<T>(
  mutate: (user: AuthPayload) => Promise<{ data: T; postId?: string }>,
): Promise<ActionResult<T>> {
  try {
    const user = await getAuthPayload();
    if (!user) throw new UnauthorizedError();

    const { data, postId } = await mutate(user);

    // 先失效再返回：返回值走同一响应，页面重渲染已带上新数据
    revalidateBlogPages(postId);
    invalidateBlogCache();

    return { ok: true, data };
  } catch (err) {
    return toFailure(err);
  }
}
