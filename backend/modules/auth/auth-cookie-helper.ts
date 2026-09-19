/**
 * @file auth-cookie-helper.ts
 * @description 鉴权 Cookie 读写助手：向响应写入/清除登录 token 与登录状态标记；仅服务端可用
 *
 * 不依赖任何 Web 框架：只要求响应对象具备 `cookies.set(name, value, options)`。
 * Next 适配：NextResponse 原生满足；Express 适配：`{ cookies: { set: (n, v, o) => res.cookie(n, v, o) } }`。
 */
import type { User } from '@my-app/shared';
import { env } from '../../config/env';
import type { TokenService } from './services/token-service';
import { AUTH_TOKEN_COOKIE, AUTH_STATUS_COOKIE } from '@my-app/shared/lib/auth-constants';

/** 能写入 Cookie 的最小响应结构（框架无关） */
export interface CookieWritable {
  /** 写入/覆盖一个 Cookie；maxAge 为 0 表示立即过期（删除语义） */
  cookies: {
    set(
      name: string,
      value: string,
      options: { httpOnly: boolean; secure: boolean; sameSite: 'lax'; path: string; maxAge: number },
    ): void;
  };
}

/**
 * 构造鉴权 Cookie 的公共选项；overrides 用于覆盖 httpOnly/maxAge 等单项
 * @param overrides httpOnly 必传；maxAge 单位为 s，缺省取 env.COOKIE_MAX_AGE（默认 7 天）
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
 * 鉴权 Cookie 助手接口：向响应写入或清除登录态 Cookie
 */
export interface AuthCookieHelper {
  /** 登录/注册成功后写入 token Cookie 与登录状态 Cookie */
  setAuthCookies(res: CookieWritable, user: User): void;

  /** 登出时清除鉴权 Cookie（内部以 maxAge:0 立即过期实现） */
  clearAuthCookies(res: CookieWritable): void;
}

/**
 * 创建鉴权 Cookie 助手实例
 * @param deps 依赖注入：tokenService 用于为签发 JWT token
 */
export function createAuthCookieHelper(deps: { tokenService: TokenService }): AuthCookieHelper {
  return {
    setAuthCookies: (res: CookieWritable, user: User): void => {
      const token = deps.tokenService.generate({
        id: user.id,
        email: user.email,
        // 老用户可能无 tokenVersion，以 0 作哨兵值保证签发与校验一致
        tokenVersion: user.tokenVersion ?? 0,
      });

      // token 置 httpOnly：前端 JS 不可读取，降低 XSS 窃取风险
      res.cookies.set(AUTH_TOKEN_COOKIE, token, cookieOptions({ httpOnly: true }));

      // 状态 Cookie 非 httpOnly，值 '1' 为哨兵：仅供前端判断是否已登录，不参与鉴权
      res.cookies.set(AUTH_STATUS_COOKIE, '1', cookieOptions({ httpOnly: false }));
    },
    clearAuthCookies: (res: CookieWritable): void => {
      // 清空值并将 maxAge 置 0（单位 s），令 Cookie 立即过期以达到删除效果
      res.cookies.set(AUTH_TOKEN_COOKIE, '', cookieOptions({ httpOnly: true, maxAge: 0 }));
      res.cookies.set(AUTH_STATUS_COOKIE, '', cookieOptions({ httpOnly: false, maxAge: 0 }));
    },
  };
}
