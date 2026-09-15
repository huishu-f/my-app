/**
 * @file route.ts
 * @description 注册接口 POST /api/auth/register，创建新账号并返回脱敏用户信息（不自动登录）；按客户端 IP 限流（5 分钟 5 次）
 */
import { type NextRequest } from 'next/server';
import { getContainer, toSafeUser } from '@/server/container';
import { sendCreated, sendError } from '@/server/utils/api-response';
import { parseRegisterBody } from '@/server/modules/auth/auth.validators';
import { isRateLimited, getClientIp } from '@/server/utils/rate-limit';
import { RateLimitError } from '@/server/errors';

/** 5 分钟内最多 5 次尝试 */
const LIMIT = 5;
/** 限流窗口时长，单位毫秒 */
const WINDOW_MS = 5 * 60 * 1000;

/**
 * 注册新用户：校验邮箱、用户名唯一性后创建账号，返回脱敏用户信息，注册后需另行登录
 * @param request 请求对象，包含客户端 IP 与注册请求体
 * @returns 创建成功响应，返回脱敏用户信息
 * @throws 参数校验失败、邮箱或用户名已存在或触发限流时抛错，由 sendError 统一处理
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`register:${ip}`, LIMIT, WINDOW_MS)) {
      throw new RateLimitError('注册过于频繁，请 5 分钟后再试');
    }

    const body = await request.json();
    const dto = parseRegisterBody(body);
    const { authService } = getContainer();
    const user = await authService.register(dto);
    return sendCreated({ user: toSafeUser(user) }, '注册成功，请登录');
  } catch (err) {
    return sendError(err);
  }
}
