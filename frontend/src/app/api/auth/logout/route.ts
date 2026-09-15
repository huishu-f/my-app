/**
 * @file route.ts
 * @description 登出接口 POST /api/auth/logout，递增 tokenVersion 使已签发 Token 全部失效并清除认证 Cookie；需携带有效登录凭证
 */
import { type NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/server/container';
import { sendError } from '@/server/utils/api-response';
import { requireAuth } from '@/server/modules/auth/auth.guard';

/**
 * 登出当前用户：递增 tokenVersion 使已签发 Token 全部失效，并清除认证 Cookie
 * @param request 请求对象，包含登录凭证 Cookie
 * @returns 登出成功响应，附带清除认证 Cookie 的 Set-Cookie
 * @throws 未登录或凭证无效时抛错，由 sendError 统一处理
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
