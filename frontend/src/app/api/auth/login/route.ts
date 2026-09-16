/**
 * @file 登录接口
 * @description 登录端点 POST /api/auth/login，仅提供 POST 一个方法；
 *              按客户端 IP 限流（5 分钟窗口内最多 5 次尝试），校验账号密码通过后签发认证 Cookie（Token Cookie 与登录状态标记），
 *              成功后即可访问需登录接口
 */
import { type NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/server/container';
import { sendError } from '@/server/utils/api-response';
import { parseLoginBody } from '@/server/modules/auth/auth.validators';
import { isRateLimited, getClientIp } from '@/server/utils/rate-limit';
import { RateLimitError } from '@/server/errors';

/** 登录尝试限流阈值：5 分钟窗口内最多 5 次 */
const LIMIT = 5;
/** 限流窗口时长，单位毫秒（5 分钟） */
const WINDOW_MS = 5 * 60 * 1000;

/**
 * 登录
 * @description 先按客户端 IP 做限流检查（超限抛 RateLimitError），再校验请求体并执行账号密码验证，
 *              通过后签发认证 Cookie（Token Cookie 与登录状态标记）写入响应
 * @param request 请求对象，包含客户端 IP 与登录请求体（账号、密码）
 * @returns 登录成功响应（code 0），并附带写入认证 Cookie 的 Set-Cookie 头
 * @throws 触发限流、凭证错误或账号禁用时抛错，由 sendError 统一返回错误响应
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(`login:${ip}`, LIMIT, WINDOW_MS)) {
      throw new RateLimitError('尝试过于频繁，请 5 分钟后再试');
    }

    const body = await request.json();
    const dto = parseLoginBody(body);
    const { authService, authCookieHelper } = getContainer();
    const user = await authService.login(dto);
    const response = NextResponse.json(
      { code: 0, data: null, message: '登录成功' },
      { status: 200 },
    );
    authCookieHelper.setAuthCookies(response, user);
    return response;
  } catch (err) {
    return sendError(err);
  }
}
