/**
 * @file route.ts
 * @description POST /api/auth/login：邮箱密码登录并写入鉴权 Cookie；按客户端 IP 限流以防暴力尝试
 */
import { NextResponse } from 'next/server';
import { defineRoute, parseJsonBody } from '@/server/utils/route-handler';
import { parseLoginBody } from '@/server/modules/auth/auth.validators';

/**
 * 校验账号密码并签发鉴权 Cookie
 * @returns 成功返回 code 0；邮箱或密码错误 401，账号被禁用 403，参数非法 400，超出限流 429
 */
export const POST = defineRoute(
  async ({ request, container }) => {
    const body = await parseJsonBody(request);
    const dto = parseLoginBody(body);
    const user = await container.authService.login(dto);
    const response = NextResponse.json(
      { code: 0, data: null, message: '登录成功' },
      { status: 200 },
    );
    container.authCookieHelper.setAuthCookies(response, user);
    return response;
  },
  {
    rateLimit: {
      key: 'login',
      limit: 5,
      windowMs: 5 * 60 * 1000,
      message: '尝试过于频繁，请 5 分钟后再试',
    },
  },
);
