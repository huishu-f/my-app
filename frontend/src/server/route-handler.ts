/**
 * @file route-handler.ts
 * @description API 路由包装器：统一注入依赖容器、鉴权、限流与错误处理，并提供上下文类型与 id 校验工具
 */
import 'server-only';
import type { NextRequest, NextResponse } from 'next/server';
// 副作用导入：把所有 API 路由都会经过的这里当作运行时适配的注册点，
// 保证 `configureRuntime` 与路由处理器落在同一模块实例上（incrementView 依赖它挂在响应之后执行）。
import '@/server/runtime';
import { getContainer } from '@my-app/backend/container';
import type { Container } from '@my-app/backend/container';
import { sendError } from '@/server/api-response';
import { requireAuth, tryAuth, type AuthDeps } from '@my-app/backend/modules/auth/auth-guard';
import type { AuthPayload } from '@my-app/shared';
import { isRateLimited, getClientIp } from '@my-app/backend/utils/rate-limit';
import { RateLimitError, NotFoundError, ValidationError } from '@my-app/backend/errors';

/**
 * 传入业务 handler 的路由上下文，聚合请求、路径参数、依赖容器与鉴权结果
 * @template P 动态路由 params 的类型，默认无参数
 */
export interface RouteContext<P = Record<string, never>> {
  /** 原始请求对象 */
  request: NextRequest;

  /** 已解析的动态路由参数 */
  params: P;

  /** 全局依赖容器单例 */
  container: Container;

  /** 当前登录用户载荷；未登录或 auth 为 none 时为 null */
  auth: AuthPayload | null;
}

/**
 * defineRoute 的可选行为开关：鉴权模式与限流配置
 */
interface RouteOptions {
  /** 鉴权模式：required 必须登录、optional 尝试解析不强制、none 不校验（默认） */
  auth?: 'required' | 'optional' | 'none';

  /** 限流配置；提供时按 客户端IP 维度做滑动窗口限流 */
  rateLimit?: {
    /** 限流维度前缀，实际键为 key:客户端IP */
    key: string;

    /** 窗口内允许的最大请求数 */
    limit: number;

    /** 限流窗口长度，单位 ms */
    windowMs: number;

    /** 触发限流时的提示文案，默认 '请求过于频繁，请稍后再试' */
    message?: string;
  };
}

/**
 * 定义受保护 API 路由：包裹业务 handler，统一完成容器注入、鉴权、限流、参数解析与错误转换
 * @param handler 业务处理函数，接收 RouteContext 并返回 NextResponse
 * @param options 鉴权与限流等行为开关
 * @returns 符合 Next.js App Router 签名的路由处理函数；handler 抛错时统一转 sendError 响应
 * @template P 动态路由 params 的类型
 */
export function defineRoute<P = Record<string, never>>(
  handler: (ctx: RouteContext<P>) => Promise<NextResponse>,
  options?: RouteOptions,
) {
  return async (request: NextRequest, context?: { params: Promise<P> }): Promise<NextResponse> => {
    try {
      const container = getContainer();

      // 按 auth 模式解析登录态：required 缺登录会抛错，optional 允许匿名
      let auth: AuthPayload | null = null;
      if (options?.auth === 'required') {
        const deps: AuthDeps = {
          tokenService: container.tokenService,
          userRepo: container.userRepo,
        };
        auth = await requireAuth(request, deps);
      } else if (options?.auth === 'optional') {
        const deps: AuthDeps = {
          tokenService: container.tokenService,
          userRepo: container.userRepo,
        };
        auth = await tryAuth(request, deps);
      }

      if (options?.rateLimit) {
        const ip = getClientIp(request);
        if (
          await isRateLimited(
            `${options.rateLimit.key}:${ip}`,
            options.rateLimit.limit,
            options.rateLimit.windowMs,
          )
        ) {
          throw new RateLimitError(options.rateLimit.message ?? '请求过于频繁，请稍后再试');
        }
      }

      // Next.js 15 params 为 Promise，需 await 后使用
      const params = (context?.params ? await context.params : {}) as P;

      return await handler({ request, params, container, auth });
    } catch (err) {
      // 集中处理：任意异常经 sendError 归一为统一错误响应
      return sendError(err);
    }
  };
}

/**
 * 校验并返回非空的路径参数 id
 * @param params 含可选 id 的参数对象
 * @param label id 缺失时抛出的 NotFound 错误文案，默认 '文章不存在'
 * @returns trim 后的非空 id
 * @throws id 缺失或为纯空白时抛出 NotFoundError（HTTP 404）
 */
export function requireId(params: { id?: string }, label = '文章不存在'): string {
  const id = params.id?.trim();
  if (!id) throw new NotFoundError(label);
  return id;
}

/**
 * 安全解析请求体 JSON：非法 JSON 统一抛 400（ValidationError），
 * 替代各路由裸 request.json() —— 后者抛出的 SyntaxError 会被包成 500 并向客户端透出解析器内部信息
 * @param request 请求对象
 * @returns 解析后的对象
 * @throws 请求体不是合法 JSON 时抛出 ValidationError（HTTP 400）
 */
export async function parseJsonBody<T = unknown>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ValidationError('请求体必须是合法的 JSON');
  }
}
