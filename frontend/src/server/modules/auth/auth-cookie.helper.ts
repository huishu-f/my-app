/**
 * @file auth-cookie.helper.ts
 * @description 认证 Cookie 写入/清除辅助：登录时签发 token 并下发 cookie，退出时清除，供登录注销路由复用
 */

import 'server-only';
import type { NextResponse } from 'next/server';
import type { User } from '@my-app/shared';
import { env } from '@server/config/env';
import type { TokenService } from './services/token.service';
import { AUTH_TOKEN_COOKIE, AUTH_STATUS_COOKIE } from '@/lib/auth-constants';

/**
 * 构建 Cookie 配置项
 * @param overrides 覆盖项：httpOnly 必传，maxAge 可选（缺省用 env.COOKIE_MAX_AGE，秒）
 * @returns 合并后的 Cookie 配置，secure 取生产环境标记、sameSite=lax、path 为全站
 */
function cookieOptions(overrides: { httpOnly: boolean; maxAge?: number }) {
  return {
    secure: env.isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: env.COOKIE_MAX_AGE,
    ...overrides,
  };
}

/**
 * 认证 Cookie 辅助器接口
 */
export interface AuthCookieHelper {
  /** 签发 token 并写入登录态 Cookie（含前端可读状态标记） */
  setAuthCookies(res: NextResponse, user: User): void;
  /** 清除登录态 Cookie，用于退出登录 */
  clearAuthCookies(res: NextResponse): void;
}

/**
 * 创建认证 Cookie 辅助器
 * @param deps 依赖注入，需提供 tokenService（签发 JWT）
 * @returns 含 setAuthCookies/clearAuthCookies 的辅助器
 */
export function createAuthCookieHelper(deps: { tokenService: TokenService }): AuthCookieHelper {
  return {
    setAuthCookies: (res: NextResponse, user: User): void => {
      const token = deps.tokenService.generate({
        id: user.id,
        email: user.email,
        tokenVersion: user.tokenVersion ?? 0,
      });
      res.cookies.set(AUTH_TOKEN_COOKIE, token, cookieOptions({ httpOnly: true }));
      res.cookies.set(AUTH_STATUS_COOKIE, '1', cookieOptions({ httpOnly: false }));
    },
    clearAuthCookies: (res: NextResponse): void => {
      res.cookies.set(AUTH_TOKEN_COOKIE, '', cookieOptions({ httpOnly: true, maxAge: 0 }));
      res.cookies.set(AUTH_STATUS_COOKIE, '', cookieOptions({ httpOnly: false, maxAge: 0 }));
    },
  };
}
