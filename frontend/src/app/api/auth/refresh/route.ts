/**
 * @file 刷新 Token 接口
 * @description Token 刷新端点 POST /api/auth/refresh，仅提供 POST 一个方法；
 *              需携带 Token Cookie；Token 签名有效或已过期两种情况下均尝试解码并校验 tokenVersion 后重新签发，
 *              刷新成功写入新认证 Cookie 并返回脱敏用户信息
 */
import { type NextRequest, NextResponse } from 'next/server';
import { getContainer, toSafeUser } from '@/server/container';
import { sendError } from '@/server/utils/api-response';
import { UnauthorizedError } from '@/server/errors';
import { AUTH_TOKEN_COOKIE } from '@/lib/auth-constants';

/**
 * 刷新 Token
 * @description 从 Cookie 读取 Token：签名有效时直接取 payload；仅过期时可解码取 payload（给用户一个宽限期）；
 *              其余无效情况一律拒绝。随后调用 authService.refresh 校验 tokenVersion 并重新签发，
 *              通过 authCookieHelper 将新认证 Cookie 写入响应
 * @param request 请求对象，包含待刷新的 Token Cookie
 * @returns 刷新成功响应（code 0），data 为脱敏用户信息，并附带写入新认证 Cookie 的 Set-Cookie 头
 * @throws Token 缺失、无效（非过期原因）、无法解析或已失效（tokenVersion 不匹配）时抛 UnauthorizedError，由 sendError 统一返回错误响应
 */
export async function POST(request: NextRequest) {
  try {
    const { tokenService, authService, authCookieHelper } = getContainer();
    const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
    if (!token) {
      throw new UnauthorizedError('无 Token，请重新登录');
    }
    const result = tokenService.verify(token);
    if (!result.success && result.errorType !== 'expired') {
      throw new UnauthorizedError('Token 无效，请重新登录');
    }
    const payload = result.success ? result.payload : tokenService.decode(token);
    if (!payload) {
      throw new UnauthorizedError('Token 无法解析，请重新登录');
    }
    const user = await authService.refresh(payload);
    const response = NextResponse.json(
      { code: 0, data: { user: toSafeUser(user) }, message: 'Token 已刷新' },
      { status: 200 },
    );
    authCookieHelper.setAuthCookies(response, user);
    return response;
  } catch (err) {
    return sendError(err);
  }
}
