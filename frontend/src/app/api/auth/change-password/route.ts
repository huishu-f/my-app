/**
 * @file route.ts
 * @description POST /api/auth/change-password：已登录用户修改密码，成功后清除鉴权 Cookie 要求重新登录
 */
import { NextResponse } from 'next/server';
import { defineRoute, parseJsonBody } from '@/server/route-handler';
import { parseChangePasswordBody } from '@my-app/backend/modules/auth/auth-validators';

/**
 * 修改当前登录用户的密码
 * @returns 成功返回 code 0；未登录或当前密码错误 401，参数非法 400
 */
export const POST = defineRoute(
  async ({ request, container, auth }) => {
    const body = await parseJsonBody(request);
    const dto = parseChangePasswordBody(body);
    await container.authService.changePassword(auth!.id, dto);
    const response = NextResponse.json(
      { code: 0, data: null, message: '密码修改成功，请重新登录' },
      { status: 200 },
    );
    // service 层已提升 tokenVersion 使旧 Token 全部失效，这里同步清 Cookie 把客户端踢回登录流程
    container.authCookieHelper.clearAuthCookies(response);
    return response;
  },
  { auth: 'required' },
);
