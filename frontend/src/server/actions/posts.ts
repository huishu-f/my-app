/**
 * @file posts.ts
 * @description 文章写操作的 Server Action：新建/更新/删除文章，并在同一次服务端往返内完成缓存失效
 *
 * 为什么文章的「写」走 Server Action 而不是复用 Route Handler：
 * Route Handler 里的 revalidateTag 只清服务端 Data/Full Route Cache，清不掉浏览器 Client Cache
 * （staleTimes.static 默认 5 分钟），作者删/改完再回列表会命中旧 RSC 快照，看着像「没删掉」；
 * 而 Server Action 内的重验证会把 Client Cache 一并清掉，且「变更 + 失效 + 重渲染」在同一次往返内完成
 * （见官方 revalidatePath 文档的 purge the Client Cache 与 server-actions 指南的 single roundtrip）。
 *
 * 边界：只承担同源 UI 的写路径。/api/posts 仍是对外数据接口，两者共用同一 blogService，
 * 业务规则只有一份；这个文件不复制 service 逻辑，只补「鉴权入口 + 缓存失效 + 可序列化错误」。
 */
'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getContainer } from '@server/container';
import { getAuthPayload } from '@/services/auth/server';
import { parseCreatePostBody, parseUpdatePostBody } from '@server/modules/blog/blog.validators';
import { invalidateBlogCache } from '@/server/utils/cache';
import { getClientIp, isRateLimited } from '@/server/utils/rate-limit';
import {
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  isAppError,
} from '@server/errors';
import { logger } from '@server/utils/logger';
import type {
  AuthPayload,
  CreatePostDto,
  PostData,
  UpdatePostDto,
  ValidationErrorDetail,
} from '@my-app/shared';

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

/**
 * 失效本次变更影响的页面路径（route 文件结构，非浏览器 URL；/[locale] 为动态段，故需 type）
 * 首页与列表页都由文章派生，必须一起失效；带 postId 时再失效详情页，避免作者改完返回详情页看到旧内容
 */
function revalidateBlogPages(postId?: string): void {
  revalidatePath('/[locale]', 'page');
  revalidatePath('/[locale]/posts', 'page');
  if (postId) revalidatePath('/[locale]/posts/[id]', 'page');
}

/**
 * 把异常收敛为可序列化的失败结果（口径与 sendError 对齐）
 * @param err 捕获到的任意异常
 * @returns 失败结果；非 AppError 一律按 500 处理且不回传内部信息
 */
function toFailure(err: unknown): Extract<ActionResult<never>, { ok: false }> {
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
 * 执行一次受控变更：统一鉴权 → 变更 → 缓存失效，失败统一转 toFailure
 * @param mutate 实际变更逻辑，接收当前登录载荷；返回数据与需要精确失效的文章 id（可选）
 * @returns 成功/失败的判别联合结果
 * @template T 变更返回的数据类型
 */
async function runMutation<T>(
  mutate: (user: AuthPayload) => Promise<{ data: T; postId?: string }>,
): Promise<ActionResult<T>> {
  try {
    const user = await getAuthPayload();
    if (!user) throw new UnauthorizedError();

    const { data, postId } = await mutate(user);

    // 先失效再返回：返回值走同一响应，页面重渲染已带上新数据
    revalidateBlogPages(postId);
    invalidateBlogCache(postId);

    return { ok: true, data };
  } catch (err) {
    return toFailure(err);
  }
}

/**
 * 取访客 IP 用于限流：Server Action 无 NextRequest，但可从当前请求的 headers 读转发头
 * @returns 客户端 IP，缺失时为 'unknown'
 */
async function clientIp(): Promise<string> {
  return getClientIp({ headers: await headers() });
}

/**
 * 新建文章，作者取自登录态而非入参
 * @param input 文章创建数据，服务端按与 API 同一套 schema 校验
 * @returns 成功返回 { post }；未登录 401、参数非法 400、封面图非白名单图床 422、发布过频 429
 */
export async function createPostAction(input: CreatePostDto): Promise<ActionResult<PostData>> {
  // 与 POST /api/posts 共用同一限流键：改用 Server Action 后不能丢掉发布频次保护
  // （Server Action 是可直接 POST 的入口，不能把它当作「只有 UI 能调」）
  if (await isRateLimited(`posts:create:${await clientIp()}`, 10, 5 * 60_000)) {
    return toFailure(new RateLimitError('发布过于频繁，请稍后再试'));
  }

  return runMutation(async (user) => {
    const dto = parseCreatePostBody(input);
    const { blogService } = getContainer();
    const post = await blogService.createPost({ ...dto, authorId: user.id });
    // 新建会改变全量列表与分类/标签聚合，不传 postId（无可精确失效的旧文章）
    return { data: { post } };
  });
}

/**
 * 更新文章（仅作者本人）
 * @param id 文章 id
 * @param input 待更新字段，服务端按与 API 同一套 schema 校验
 * @returns 成功返回更新后的 { post }；未登录 401、文章不存在 404、非作者 403、参数非法 400
 */
export async function updatePostAction(
  id: string,
  input: UpdatePostDto,
): Promise<ActionResult<PostData>> {
  return runMutation(async (user) => {
    const postId = id?.trim();
    if (!postId) throw new NotFoundError('文章不存在');

    const dto = parseUpdatePostBody(input);
    const { blogService } = getContainer();
    const post = await blogService.updatePost(postId, dto, user.id);
    return { data: { post }, postId };
  });
}

/**
 * 删除文章（仅作者本人），service 层会级联清理该文章的评论与用户的点赞/收藏记录
 * @param id 文章 id
 * @returns 成功返回 data 为 null；未登录 401、文章不存在 404、非作者 403
 */
export async function deletePostAction(id: string): Promise<ActionResult<null>> {
  return runMutation(async (user) => {
    const postId = id?.trim();
    if (!postId) throw new NotFoundError('文章不存在');

    const { blogService } = getContainer();
    await blogService.deletePost(postId, user.id);
    return { data: null, postId };
  });
}
