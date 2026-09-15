/**
 * @file route.ts
 * @description 修改密码接口 POST /api/auth/change-password，校验登录态后更新密码，成功则清除认证 Cookie 强制重新登录；需携带有效登录凭证
 */
import { type NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/server/container';
import { sendError } from '@/server/utils/api-response';
import { requireAuth } from '@/server/modules/auth/auth.guard';
import { parseChangePasswordBody } from '@/server/modules/auth/auth.validators';

/**
 * 修改当前密码：校验登录态后更新密码并递增 tokenVersion 使旧 Token 失效，随后清除认证 Cookie 要求重新登录
 * @param request 请求对象，包含登录凭证 Cookie 与修改密码请求体
 * @returns 修改成功响应，附带清除认证 Cookie 的 Set-Cookie
 * @throws 未登录、凭证无效或当前密码错误时抛错，由 sendError 统一处理
 */
export async function POST(request: NextRequest) {
  try {
    const { authService, authCookieHelper, tokenService, userRepo } = getContainer();
    const auth = await requireAuth(request, { tokenService, userRepo });
    const body = await request.json();
    const dto = parseChangePasswordBody(body);
    await authService.changePassword(auth.id, dto);
    const response = NextResponse.json(
      { code: 0, data: null, message: '密码修改成功，请重新登录' },
      { status: 200 },
    );
    authCookieHelper.clearAuthCookies(response);
    return response;
  } catch (err) {
    return sendError(err);
  }
}
