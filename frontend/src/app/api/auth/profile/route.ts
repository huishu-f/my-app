/**
 * @file route.ts
 * @description PUT /api/auth/profile：更新当前登录用户的资料并返回脱敏结果
 */
import { defineRoute, parseJsonBody } from '@/server/utils/route-handler';
import { sendSuccess } from '@/server/utils/api-response';
import { parseUpdateProfileBody } from '@/server/modules/auth/auth.validators';
import { toSafeUser } from '@/server/container';

/**
 * 更新我的资料
 * @returns 成功返回 { user }（toSafeUser 脱敏后的字段）；未登录 401，参数非法 400
 */
export const PUT = defineRoute(
  async ({ request, container, auth }) => {
    const body = await parseJsonBody(request);
    const profileData = parseUpdateProfileBody(body);
    const user = await container.authService.updateProfile(auth!.id, profileData);
    return sendSuccess({ user: toSafeUser(user) }, '资料更新成功');
  },
  { auth: 'required' },
);
