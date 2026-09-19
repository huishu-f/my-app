/**
 * @file route.ts
 * @description GET /api/auth/me：获取当前登录用户信息，响应经脱敏处理
 */
import { defineRoute } from '@/server/route-handler';
import { sendSuccess } from '@/server/api-response';
import { toSafeUser } from '@my-app/backend/container';

/**
 * 获取我的资料
 * @returns 成功返回 { user }，字段已由 toSafeUser 剔除 password/tokenVersion/disabled；未登录 401，账号被禁用 403
 */
export const GET = defineRoute(
  async ({ container, auth }) => {
    const user = await container.authService.getMe(auth!.id);
    return sendSuccess({ user: toSafeUser(user) }, '获取成功');
  },
  { auth: 'required' },
);
