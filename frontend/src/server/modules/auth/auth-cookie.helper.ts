/**
 * @file auth-cookie.helper.ts
 * @description 认证 Cookie 辅助器工厂：登录/刷新时签发 JWT 并写入登录态 Cookie，
 *              退出登录时清除 Cookie。通过依赖注入 TokenService，供登录、注销、刷新路由复用。
 *              仅限服务端（server-only）。
 */

import 'server-only';
import type { NextResponse } from 'next/server';
import type { User } from '@my-app/shared';
import { env } from '@server/config/env';
import type { TokenService } from './services/token.service';
import { AUTH_TOKEN_COOKIE, AUTH_STATUS_COOKIE } from '@/lib/auth-constants';

/**
 * 构建 Cookie 配置项
 * @param overrides 覆盖项：httpOnly 必传；maxAge 可选（缺省使用 env.COOKIE_MAX_AGE，单位秒）
 * @returns 合并后的 Cookie 配置对象：secure 取生产环境标记、sameSite 为 lax、path 为全站
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
  /**
   * 签发 token 并写入登录态 Cookie
   * @param res Next 响应对象，Cookie 写入其 headers
   * @param user 当前用户，取 id/email/tokenVersion 签发 JWT
   */
  setAuthCookies(res: NextResponse, user: User): void;
  /**
   * 清除登录态 Cookie（写同名空值并置 maxAge=0），用于退出登录
   * @param res Next 响应对象
   */
  clearAuthCookies(res: NextResponse): void;
}

/**
 * 创建认证 Cookie 辅助器
 * @param deps 依赖注入，需提供 tokenService（负责签发 JWT）
 * @returns 实现 AuthCookieHelper 的辅助器对象
 * @example
 * const helper = createAuthCookieHelper({ tokenService });
 * helper.setAuthCookies(res, user);
 */
export function createAuthCookieHelper(deps: { tokenService: TokenService }): AuthCookieHelper {
  return {
    setAuthCookies: (res: NextResponse, user: User): void => {
      const token = deps.tokenService.generate({
        id: user.id,
        email: user.email,
        tokenVersion: user.tokenVersion ?? 0,
      });
      // auth_token 为 httpOnly，前端 JS 不可读
      res.cookies.set(AUTH_TOKEN_COOKIE, token, cookieOptions({ httpOnly: true }));
      // 登录状态标记非 httpOnly，供前端判断登录态
      res.cookies.set(AUTH_STATUS_COOKIE, '1', cookieOptions({ httpOnly: false }));
    },
    clearAuthCookies: (res: NextResponse): void => {
      res.cookies.set(AUTH_TOKEN_COOKIE, '', cookieOptions({ httpOnly: true, maxAge: 0 }));
      res.cookies.set(AUTH_STATUS_COOKIE, '', cookieOptions({ httpOnly: false, maxAge: 0 }));
    },
  };
}
