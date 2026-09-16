/**
 * @file API 路由工厂
 * @description API Route Handler 的高阶封装工厂：统一处理 getContainer、鉴权（required/optional）、
 *              限流、路由参数解析与 try/catch → sendError，让每个路由 handler 只写业务逻辑，
 *              消除大量重复样板代码。
 *              用法：export const GET = defineRoute(async ({ request, container, auth }) => {...}, { auth: 'required' })
 */
import 'server-only';
import type { NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@server/container';
import type { Container } from '@server/container';
import { sendError } from './api-response';
import { requireAuth, tryAuth, type AuthDeps } from '@server/modules/auth/auth.guard';
import type { AuthPayload } from '@my-app/shared';
import { isRateLimited, getClientIp } from './rate-limit';
import { RateLimitError, NotFoundError } from '@server/errors';

/**
 * 路由 handler 接收的上下文
 * @description defineRoute 包装后传入业务 handler 的参数集合
 */
export interface RouteContext<P = Record<string, never>> {
  /** 原始 NextRequest 请求对象 */
  request: NextRequest;
  /** 动态路由参数（Next.js 15 中为 Promise，工厂内已 await 并解包），静态路由为空对象 */
  params: P;
  /** 依赖容器，提供全部仓储与服务 */
  container: Container;
  /** 已认证用户 payload；auth='required' 时保证非 null，auth='optional'/'none' 时可能为 null */
  auth: AuthPayload | null;
}

/**
 * 路由配置项
 * @description 定义路由的鉴权模式与限流策略
 */
interface RouteOptions {
  /**
   * 鉴权模式
   * required=必须登录，校验失败抛 401；optional=可选登录，失败时 auth 为 null；none=跳过鉴权
   */
  auth?: 'required' | 'optional' | 'none';
  /**
   * 限流配置
   */
  rateLimit?: {
    /** 限流 key 前缀（内部拼接客户端 IP 作为完整 key） */
    key: string;
    /** 窗口内允许的最大请求数 */
    limit: number;
    /** 窗口时长，单位 ms */
    windowMs: number;
    /** 被限流时的自定义提示信息 */
    message?: string;
  };
}

/**
 * API Route 高阶工厂
 * @description 包装业务 handler，按顺序执行：获取容器 → 按配置鉴权 → 按配置限流 →
 *              解析 Promise 形式的路由参数 → 调用业务 handler；任一步骤抛错统一 sendError 返回。
 * @param handler 业务处理函数，接收 RouteContext，返回 NextResponse
 * @param options 路由配置（鉴权模式、限流策略）
 * @returns 可直接赋给 GET/POST/... 的标准 Next.js 路由函数
 * @example
 * export const GET = defineRoute(async ({ request, container, auth }) => {
 *   const data = await container.blogService.getList();
 *   return sendSuccess(data);
 * }, { auth: 'required' });
 */
export function defineRoute<P = Record<string, never>>(
  handler: (ctx: RouteContext<P>) => Promise<NextResponse>,
  options?: RouteOptions,
) {
  return async (
    request: NextRequest,
    context?: { params: Promise<P> },
  ): Promise<NextResponse> => {
    try {
      const container = getContainer();

      // 鉴权：required 强制校验，optional 尽力校验失败返回 null
      let auth: AuthPayload | null = null;
      if (options?.auth === 'required') {
        const deps: AuthDeps = { tokenService: container.tokenService, userRepo: container.userRepo };
        auth = await requireAuth(request, deps);
      } else if (options?.auth === 'optional') {
        const deps: AuthDeps = { tokenService: container.tokenService, userRepo: container.userRepo };
        auth = await tryAuth(request, deps);
      }

      // 限流：以 配置key:客户端IP 为维度做滑动窗口限频
      if (options?.rateLimit) {
        const ip = getClientIp(request);
        if (isRateLimited(
          `${options.rateLimit.key}:${ip}`,
          options.rateLimit.limit,
          options.rateLimit.windowMs,
        )) {
          throw new RateLimitError(options.rateLimit.message ?? '请求过于频繁，请稍后再试');
        }
      }

      // Next.js 15 params 是 Promise，静态路由无 params 时给空对象
      const params = (context?.params ? await context.params : {}) as P;

      return await handler({ request, params, container, auth });
    } catch (err) {
      return sendError(err);
    }
  };
}

/**
 * 从路由参数中提取并校验必填 ID
 * @param params 路由参数对象（含 id 字段）
 * @param label ID 缺失时抛出的 NotFoundError 提示文案，默认 '文章不存在'
 * @returns 去除首尾空白后的 ID
 * @throws id 缺失或 trim 后为空时抛出 NotFoundError
 * @example
 * requireId({ id: ' 123 ' }) // => '123'
 */
export function requireId(params: { id?: string }, label = '文章不存在'): string {
  const id = params.id?.trim();
  if (!id) throw new NotFoundError(label);
  return id;
}
