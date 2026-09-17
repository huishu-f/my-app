/**
 * @file auth.guard.ts
 * @description 服务端路由鉴权守卫：校验 Cookie 中的 JWT 并回查用户态，提供强制登录(requireAuth)与可选登录(tryAuth)两种入口；仅服务端可用
 */
import 'server-only';
import type { NextRequest } from 'next/server';
import { UnauthorizedError, ForbiddenError } from '@server/errors';
import type { UserRepository } from './kv-user.repository';
import type { TokenService, AuthPayload, TokenVerifyResult } from './services/token.service';
import { AUTH_TOKEN_COOKIE } from '@/lib/auth-constants';

/**
 * 鉴权守卫的依赖注入集合
 */
export interface AuthDeps {
  /** JWT 签发/校验服务 */
  tokenService: TokenService;

  /** 用户仓储，用于回查 token 对应用户是否存在且有效 */
  userRepo: UserRepository;
}

/**
 * 强制鉴权：从 Cookie 取 JWT 并逐层校验（存在性→签名/过期→用户存在→tokenVersion→账号未禁用）
 * @param request 当前请求，从其 Cookie 读取 token
 * @param deps 鉴权依赖（tokenService、userRepo）
 * @returns 校验通过的 JWT 载荷 AuthPayload
 * @throws UnauthorizedError token 缺失/过期/无效、用户不存在、tokenVersion 不匹配
 * @throws ForbiddenError 账号已被禁用
 */
export async function requireAuth(request: NextRequest, deps: AuthDeps): Promise<AuthPayload> {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;

  if (!token) {
    throw new UnauthorizedError('未授权，请先登录');
  }

  const result: TokenVerifyResult = deps.tokenService.verify(token);
  if (!result.success) {
    const msg =
      result.errorType === 'expired' ? '登录已过期，请重新登录' : 'Token 无效，请重新登录';
    throw new UnauthorizedError(msg);
  }

  const decoded = result.payload;

  // 仓储异常时 catch 成 undefined，将查库失败也按“用户不存在”处理为未授权，避免抛 500
  const user = await deps.userRepo.findById(decoded.id).catch(() => undefined);
  if (!user) {
    throw new UnauthorizedError('用户不存在，请重新登录');
  }

  // tokenVersion 与签发时不一致说明用户已登出/改密使旧 token 作废；?? 0 兼容无该字段的老用户
  if ((user.tokenVersion ?? 0) !== decoded.tokenVersion) {
    throw new UnauthorizedError('Token 已失效，请重新登录');
  }

  if (user.disabled) {
    throw new ForbiddenError('账号已被禁用');
  }

  return decoded;
}

/**
 * 可选鉴权：内部调用 requireAuth，任何失败（未登录/过期/无效等）都吞掉并返回 null，用于登录可选的接口
 * @param request 当前请求
 * @param deps 鉴权依赖
 * @returns 已登录返回 AuthPayload；未登录或鉴权失败返回 null，不抛异常
 */
export async function tryAuth(request: NextRequest, deps: AuthDeps): Promise<AuthPayload | null> {
  try {
    return await requireAuth(request, deps);
  } catch {
    return null;
  }
}
