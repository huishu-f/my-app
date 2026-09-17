/**
 * @file route.ts
 * @description POST /api/auth/logout：登出当前用户，服务端作废 Token 并清除鉴权 Cookie
 */
import { NextResponse } from 'next/server';
import { defineRoute } from '@/server/utils/route-handler';

/**
 * 退出登录
 * @returns 成功返回 code 0；未登录或 Token 失效 401
 */
export const POST = defineRoute(
  async ({ container, auth }) => {
    // 递增 tokenVersion 会让该用户所有已签发 Token 同时失效，不止当前浏览器
    await container.authService.logout(auth!.id);
    const response = NextResponse.json(
      { code: 0, data: null, message: '登出成功' },
      { status: 200 },
    );
    container.authCookieHelper.clearAuthCookies(response);
    return response;
  },
  { auth: 'required' },
);
