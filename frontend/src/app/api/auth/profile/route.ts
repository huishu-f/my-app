/**
 * @file route.ts
 * @description 更新个人资料接口 PUT /api/auth/profile，更新昵称、头像、简介等资料并同步评论与文章中的作者信息；需携带有效登录凭证
 */
import { type NextRequest } from 'next/server';
import { getContainer, toSafeUser } from '@/server/container';
import { sendSuccess, sendError } from '@/server/utils/api-response';
import { requireAuth } from '@/server/modules/auth/auth.guard';
import { parseUpdateProfileBody } from '@/server/modules/auth/auth.validators';

/**
 * 更新当前用户资料：更新昵称、头像、简介、位置、网站等字段，并同步评论与文章中的作者信息
 * @param request 请求对象，包含登录凭证 Cookie 与资料更新请求体
 * @returns 更新后脱敏的用户信息
 * @throws 未登录、凭证无效、资料校验失败或用户不存在时抛错，由 sendError 统一处理
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
