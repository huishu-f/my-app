/**
 * @file auth.guard.ts
 * @description 认证守卫：从 cookie 读取 auth_token 并校验用户状态，提供必选/可选两种认证模式供路由复用
 */

import 'server-only';
import type { NextRequest } from 'next/server';
import { UnauthorizedError, ForbiddenError } from '@server/errors';
import type { UserRepository } from './kv-user.repository';
import type { TokenService, AuthPayload, TokenVerifyResult } from './services/token.service';
import { AUTH_TOKEN_COOKIE } from '@/lib/auth-constants';

/**
 * 认证守卫依赖集合
 */
export interface AuthDeps {
  /** token 校验与签发服务 */
  tokenService: TokenService;
  /** 用户仓储，用于查询用户状态与 token 版本 */
  userRepo: UserRepository;
}

/**
 * 必选认证：从 NextRequest 的 cookie 中读取 auth_token，验证后返回 AuthPayload
 * @param request Next 请求，从中读取 auth_token Cookie
 * @param deps 认证依赖，tokenService 负责校验 token，userRepo 负责查询用户
 * @returns 校验通过的用户载荷 AuthPayload
 * @throws 未登录、token 无效/过期、token 版本不符或用户不存在时抛出 UnauthorizedError；账号被禁用时抛出 ForbiddenError
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

  const user = await deps.userRepo.findById(decoded.id).catch(() => undefined);
  if (!user) {
    throw new UnauthorizedError('用户不存在，请重新登录');
  }

  if ((user.tokenVersion ?? 0) !== decoded.tokenVersion) {
    throw new UnauthorizedError('Token 已失效，请重新登录');
  }

  if (user.disabled) {
    throw new ForbiddenError('账号已被禁用');
  }

  return decoded;
}

/**
 * 可选认证：认证失败时返回 null 而非抛异常
 * @param request Next 请求
 * @param deps 认证依赖
 * @returns 认证通过返回 AuthPayload，未通过返回 null
 */
export async function tryAuth(request: NextRequest, deps: AuthDeps): Promise<AuthPayload | null> {
  try {
    return await requireAuth(request, deps);
  } catch {
    return null;
  }
}
