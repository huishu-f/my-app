/**
 * @file route.ts
 * @description 登录接口 POST /api/auth/login，校验账号密码后签发认证 Cookie；按客户端 IP 限流（5 分钟 5 次），成功后即可访问需登录接口
 */
import { type NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/server/container';
import { sendError } from '@/server/utils/api-response';
import { parseLoginBody } from '@/server/modules/auth/auth.validators';
import { isRateLimited, getClientIp } from '@/server/utils/rate-limit';
import { RateLimitError } from '@/server/errors';

/** 5 分钟内最多 5 次尝试 */
const LIMIT = 5;
/** 限流窗口时长，单位毫秒 */
const WINDOW_MS = 5 * 60 * 1000;

/**
 * 登录：校验凭证通过后签发认证 Cookie（Token Cookie 与登录状态标记）
 * @param request 请求对象，包含客户端 IP 与登录请求体
 * @returns 登录成功响应，附带写入认证 Cookie 的 Set-Cookie
 * @throws 凭证错误、账号禁用或触发限流时抛错，由 sendError 统一处理
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
