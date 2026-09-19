/**
 * @file route.ts
 * @description POST /api/auth/register：创建新账号，成功后不自动登录；按客户端 IP 限流防批量注册
 */
import { defineRoute, parseJsonBody } from '@/server/route-handler';
import { sendCreated } from '@/server/api-response';
import { parseRegisterBody } from '@my-app/backend/modules/auth/auth-validators';
import { toSafeUser } from '@my-app/backend/container';

/**
 * 创建新账号（默认 Writer 角色）
 * @returns 成功返回 201 与脱敏后的 user；邮箱或用户名已被占用 409，参数非法 400，超出限流 429
 */
export const POST = defineRoute(
  async ({ request, container }) => {
    const body = await parseJsonBody(request);
    const dto = parseRegisterBody(body);
    const user = await container.authService.register(dto);
    return sendCreated({ user: toSafeUser(user) }, '注册成功，请登录');
  },
  {
    rateLimit: {
      key: 'register',
      limit: 5,
      windowMs: 5 * 60 * 1000,
      message: '注册过于频繁，请 5 分钟后再试',
    },
  },
);
