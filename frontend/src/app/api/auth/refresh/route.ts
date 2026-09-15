/**
 * @file route.ts
 * @description 刷新 Token 接口 POST /api/auth/refresh，Token 校验通过或过期时重新签发并写入新认证 Cookie；需携带 Token Cookie
 */
import { type NextRequest, NextResponse } from 'next/server';
import { getContainer, toSafeUser } from '@/server/container';
import { sendError } from '@/server/utils/api-response';
import { UnauthorizedError } from '@/server/errors';
import { AUTH_TOKEN_COOKIE } from '@/lib/auth-constants';

/**
 * 刷新 Token：从 Cookie 读取 Token，签名有效或已过期时解码并校验 tokenVersion 后重新签发
 * @param request 请求对象，包含待刷新的 Token Cookie
 * @returns 刷新成功响应，返回脱敏用户信息并写入新认证 Cookie
 * @throws Token 缺失、无效、无法解析或已失效时抛错，由 sendError 统一处理
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
