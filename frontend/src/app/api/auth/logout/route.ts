/**
 * @file 登出接口
 * @description 登出端点 POST /api/auth/logout，仅提供 POST 一个方法；
 *              需携带有效登录凭证；登出时递增 tokenVersion 使所有已签发 Token 全部失效，
 *              并清除客户端认证 Cookie
 */
import { type NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/server/container';
import { sendError } from '@/server/utils/api-response';
import { requireAuth } from '@/server/modules/auth/auth.guard';

/**
 * 登出当前用户
 * @description 先通过 requireAuth 校验登录态，再调用 authService.logout 递增 tokenVersion
 *              使该用户已签发的全部 Token 失效，最后清除响应中的认证 Cookie
 * @param request 请求对象，包含登录凭证 Cookie
 * @returns 登出成功响应（code 0，data 为 null），并附带清除认证 Cookie 的 Set-Cookie 头
 * @throws 未登录或凭证无效时抛错，由 sendError 统一返回错误响应
 */
export async function POST(request: NextRequest) {
  try {
    const { authService, authCookieHelper, tokenService, userRepo } = getContainer();
    const auth = await requireAuth(request, { tokenService, userRepo });
    await authService.logout(auth.id);
    const response = NextResponse.json(
      { code: 0, data: null, message: '登出成功' },
      { status: 200 },
    );
    authCookieHelper.clearAuthCookies(response);
    return response;
  } catch (err) {
    return sendError(err);
  }
}
