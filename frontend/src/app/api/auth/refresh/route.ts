/**
 * @file route.ts
 * @description POST /api/auth/refresh：用 Cookie 中的旧 Token 续期登录态；已过期 Token 仅在宽限窗口内可换发
 */
import { NextResponse } from 'next/server';
import { defineRoute } from '@/server/route-handler';
import { toSafeUser } from '@my-app/backend/container';
import { UnauthorizedError } from '@my-app/backend/errors';
import { AUTH_TOKEN_COOKIE } from '@my-app/shared/lib/auth-constants';
import { env } from '@my-app/backend/config/env';

/**
 * 用 Cookie 中的 Token 换发新 Token，并回写鉴权 Cookie
 * @returns 成功返回 { user }（脱敏字段）；无 Token、签名无效、超宽限期 401
 */
export const POST = defineRoute(
  async ({ request, container }) => {
    const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
    if (!token) {
      throw new UnauthorizedError('无 Token，请重新登录');
    }
    const result = container.tokenService.verify(token);
    if (!result.success && result.errorType !== 'expired') {
      throw new UnauthorizedError('Token 无效，请重新登录');
    }
    const payload = result.success ? result.payload : container.tokenService.decode(token);
    if (!payload) {
      throw new UnauthorizedError('Token 无法解析，请重新登录');
    }

    // 宽限窗口：过期 Token 只在过期内 JWT_REFRESH_GRACE_SECONDS 秒可续期，超窗必须重新登录。
    // 防止泄漏的过期 Token 被无限刷成永久凭证。
    if (!result.success && typeof payload.exp === 'number') {
      const expiredAgo = Math.floor(Date.now() / 1000) - payload.exp;
      if (expiredAgo > env.JWT_REFRESH_GRACE_SECONDS) {
        throw new UnauthorizedError('登录已过期，请重新登录');
      }
    }

    const user = await container.authService.refresh(payload);
    const response = NextResponse.json(
      { code: 0, data: { user: toSafeUser(user) }, message: 'Token 已刷新' },
      { status: 200 },
    );
    container.authCookieHelper.setAuthCookies(response, user);
    return response;
  },
  {
    // 刷新端点本身也要限流，防止被高频滥用
    rateLimit: {
      key: 'auth:refresh',
      limit: 30,
      windowMs: 60 * 1000,
      message: '刷新过于频繁，请稍后再试',
    },
  },
);
