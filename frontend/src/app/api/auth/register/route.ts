/**
 * @file 注册接口
 * @description 注册端点 POST /api/auth/register，仅提供 POST 一个方法；
 *              按客户端 IP 限流（5 分钟窗口内最多 5 次尝试），校验邮箱、用户名唯一性后创建新账号，
 *              返回脱敏用户信息，注册后不自动登录，需另行调用登录接口
 */
import { type NextRequest } from 'next/server';
import { getContainer, toSafeUser } from '@/server/container';
import { sendCreated, sendError } from '@/server/utils/api-response';
import { parseRegisterBody } from '@/server/modules/auth/auth.validators';
import { isRateLimited, getClientIp } from '@/server/utils/rate-limit';
import { RateLimitError } from '@/server/errors';

/** 注册尝试限流阈值：5 分钟窗口内最多 5 次 */
const LIMIT = 5;
/** 限流窗口时长，单位毫秒（5 分钟） */
const WINDOW_MS = 5 * 60 * 1000;

/**
 * 注册新用户
 * @description 先按客户端 IP 做限流检查（超限抛 RateLimitError），再校验请求体并创建账号，
 *              返回脱敏后的用户信息（不含敏感字段），注册后需另行登录
 * @param request 请求对象，包含客户端 IP 与注册请求体（邮箱、用户名、密码等）
 * @returns 创建成功响应（201），data 为脱敏用户信息
 * @throws 触发限流、参数校验失败或邮箱/用户名已存在时抛错，由 sendError 统一返回错误响应
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
