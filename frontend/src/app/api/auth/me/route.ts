/**
 * @file route.ts
 * @description 当前用户信息接口 GET /api/auth/me，返回脱敏后的当前登录用户信息；需携带有效登录凭证，未登录或凭证无效时返回错误
 */
import { type NextRequest } from 'next/server';
import { getContainer, toSafeUser } from '@/server/container';
import { sendSuccess, sendError } from '@/server/utils/api-response';
import { requireAuth } from '@/server/modules/auth/auth.guard';

/**
 * 获取当前登录用户信息，返回前剥离密码等敏感字段
 * @param request 请求对象，包含登录凭证 Cookie
 * @returns 脱敏后的用户信息（不含 password、tokenVersion、disabled 等敏感字段）
 * @throws 未登录、凭证无效或用户不存在时抛错，由 sendError 统一处理
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
