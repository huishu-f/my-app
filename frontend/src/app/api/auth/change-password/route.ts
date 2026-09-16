/**
 * @file 修改密码接口
 * @description 修改密码端点 POST /api/auth/change-password，仅提供 POST 一个方法；
 *              需携带有效登录凭证；校验登录态后更新密码并递增 tokenVersion 使旧 Token 全部失效，
 *              随后清除认证 Cookie 强制用户重新登录
 */
import { type NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/server/container';
import { sendError } from '@/server/utils/api-response';
import { requireAuth } from '@/server/modules/auth/auth.guard';
import { parseChangePasswordBody } from '@/server/modules/auth/auth.validators';

/**
 * 修改当前密码
 * @description 需登录；通过 requireAuth 校验登录态后解析请求体（当前密码 + 新密码）并执行修改，
 *              修改成功同时递增 tokenVersion 使已签发 Token 失效，最后清除客户端认证 Cookie 要求重新登录
 * @param request 请求对象，包含登录凭证 Cookie 与修改密码请求体
 * @returns 修改成功响应（code 0，data 为 null），并附带清除认证 Cookie 的 Set-Cookie 头
 * @throws 未登录、凭证无效或当前密码错误时抛错，由 sendError 统一返回错误响应
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
