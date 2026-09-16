/**
 * @file 更新个人资料接口
 * @description 个人资料更新端点 PUT /api/auth/profile，仅提供 PUT 一个方法；
 *              需携带有效登录凭证；更新昵称、头像、简介、位置、网站等资料字段，
 *              并同步评论与文章中冗余存储的作者信息，返回脱敏后的用户信息
 */
import { type NextRequest } from 'next/server';
import { getContainer, toSafeUser } from '@/server/container';
import { sendSuccess, sendError } from '@/server/utils/api-response';
import { requireAuth } from '@/server/modules/auth/auth.guard';
import { parseUpdateProfileBody } from '@/server/modules/auth/auth.validators';

/**
 * 更新当前用户资料
 * @description 需登录；解析请求体后更新当前用户的昵称、头像、简介、位置、网站等资料字段，
 *              并同步评论与文章中的作者冗余信息，保证历史内容展示的作者信息一致
 * @param request 请求对象，包含登录凭证 Cookie 与资料更新请求体
 * @returns 成功响应，data 为更新后脱敏的用户信息（不含敏感字段）
 * @throws 未登录、凭证无效、资料校验失败或用户不存在时抛错，由 sendError 统一返回错误响应
 */
export async function PUT(request: NextRequest) {
  try {
    const { authService, tokenService, userRepo } = getContainer();
    const auth = await requireAuth(request, { tokenService, userRepo });
    const body = await request.json();
    const profileData = parseUpdateProfileBody(body);
    const user = await authService.updateProfile(auth.id, profileData);
    return sendSuccess({ user: toSafeUser(user) }, '资料更新成功');
  } catch (err) {
    return sendError(err);
  }
}
