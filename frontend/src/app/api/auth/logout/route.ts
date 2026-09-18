/**
 * @file route.ts
 * @description POST /api/auth/logout：登出当前用户，服务端作废 Token 并清除鉴权 Cookie
 */
import { NextResponse } from 'next/server';
import { defineRoute } from '@/server/utils/route-handler';

/**
 * 退出登录
 * @returns 成功返回 code 0；无论 Token 是否有效都清除鉴权 Cookie 并返回成功
 * @description auth 用 optional 而非 required：退出语义上就该「无论如何都清 Cookie」——
 *   Token 已过期/验签失败/用户已被删时若按 required 直接 401，清 Cookie 的代码根本执行不到，
 *   用户会陷入「退出失败、也退不出来」的死局（线上实例数据不一致时发生过）。
 *   Token 有效则顺带递增 tokenVersion 作废该用户全部已签发 Token，无效则跳过只清 Cookie。
 */
export const POST = defineRoute(
  async ({ container, auth }) => {
    if (auth) {
      // 递增 tokenVersion 会让该用户所有已签发 Token 同时失效，不止当前浏览器
      await container.authService.logout(auth.id);
    }
    const response = NextResponse.json(
      { code: 0, data: null, message: '登出成功' },
      { status: 200 },
    );
    container.authCookieHelper.clearAuthCookies(response);
    return response;
  },
  { auth: 'optional' },
);
