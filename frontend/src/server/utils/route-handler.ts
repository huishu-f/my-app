/**
 * @file route-handler.ts
 * @description API Route 高阶工厂函数，消除 25+ 个 handler 中的 try/catch +
 *              getContainer + requireAuth/tryAuth + 限流 + ID 校验样板代码。
 *              用法：export const GET = defineRoute(async ({ request, container, auth }) => { ... }, { auth: 'required' })
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

/** Route handler 接收的上下文 */
export interface RouteContext<P = Record<string, never>> {
  request: NextRequest;
  params: P;
  container: Container;
  /** 已认证用户 payload；auth='required' 时非 null，auth='optional' 时可能 null */
  auth: AuthPayload | null;
}

/** Route 配置项 */
interface RouteOptions {
  /** 鉴权模式：required=必须登录(失败抛 401) / optional=可选登录(失败返回 null) / none=不鉴权 */
  auth?: 'required' | 'optional' | 'none';
  /** 限流配置 */
  rateLimit?: {
    key: string;
    limit: number;
    windowMs: number;
    message?: string;
  };
}

/**
 * API Route 高阶工厂，统一处理 try/catch → sendError、getContainer、requireAuth/tryAuth、限流，handler 仅关注业务逻辑
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

      // 鉴权
      let auth: AuthPayload | null = null;
      if (options?.auth === 'required') {
        const deps: AuthDeps = { tokenService: container.tokenService, userRepo: container.userRepo };
        auth = await requireAuth(request, deps);
      } else if (options?.auth === 'optional') {
        const deps: AuthDeps = { tokenService: container.tokenService, userRepo: container.userRepo };
        auth = await tryAuth(request, deps);
      }

      // 限流
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

      const params = (context?.params ? await context.params : {}) as P;

      return await handler({ request, params, container, auth });
    } catch (err) {
      return sendError(err);
    }
  };
}

/**
 * 从路由参数中提取并校验 ID
 * @param params 路由参数对象（含 id 字段）
 * @param label 不存在时的错误提示
 * @returns trim 后的 ID
 */
export function requireId(params: { id?: string }, label = '文章不存在'): string {
  const id = params.id?.trim();
  if (!id) throw new NotFoundError(label);
  return id;
}
