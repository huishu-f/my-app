/**
 * @file 当前用户信息接口
 * @description 当前登录用户信息端点 GET /api/auth/me，仅提供 GET 一个方法；
 *              需携带有效登录凭证；返回剥离密码等敏感字段后的脱敏用户信息
 */
import { type NextRequest } from 'next/server';
import { getContainer, toSafeUser } from '@/server/container';
import { sendSuccess, sendError } from '@/server/utils/api-response';
import { requireAuth } from '@/server/modules/auth/auth.guard';

/**
 * 获取当前登录用户信息
 * @description 需登录；通过 requireAuth 校验登录态后按用户 id 查询，
 *              返回前经 toSafeUser 剥离密码、tokenVersion 等敏感字段
 * @param request 请求对象，包含登录凭证 Cookie
 * @returns 成功响应，data 为脱敏后的用户信息（不含 password、tokenVersion、disabled 等敏感字段）
 * @throws 未登录、凭证无效或用户不存在时抛错，由 sendError 统一返回错误响应
 */
export async function GET(request: NextRequest) {
  try {
    const { authService, tokenService, userRepo } = getContainer();
    const auth = await requireAuth(request, { tokenService, userRepo });
    const user = await authService.getMe(auth.id);
    return sendSuccess({ user: toSafeUser(user) }, '获取成功');
  } catch (err) {
    return sendError(err);
  }
}
