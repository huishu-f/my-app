/**
 * @file server.ts
 * @description 服务端鉴权辅助函数，供 Server Components 获取当前登录用户
 *              在 Netlify Team Protection 等私有部署环境下，Server Component 内部
 *              的 HTTP 回环请求会被边缘 401 拦截，因此直接读取 cookie 并调用进程内
 *              Service 层完成鉴权，绕过 HTTP 回环。
 */
import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { getContainer, toSafeUser } from '@server/container';
import { AUTH_COOKIE } from '@/lib/api/request';
import type { AuthPayload, User } from '@my-app/shared';

/**
 * 从 cookie 中解析并校验当前请求的 JWT payload
 * @returns 校验通过的 AuthPayload，未登录或校验失败返回 null
 */
async function resolveAuthPayload(): Promise<AuthPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const { tokenService, userRepo } = getContainer();
  const result = tokenService.verify(token);
  if (!result.success) return null;

  const decoded = result.payload;
  const dbUser = await userRepo.findById(decoded.id).catch(() => undefined);
  if (!dbUser) return null;
  if ((dbUser.tokenVersion ?? 0) !== decoded.tokenVersion) return null;
  if (dbUser.disabled) return null;

  return decoded;
}

/**
 * 获取当前登录用户（服务端），使用 React cache() 确保同一请求内多次调用只执行一次；
 * 直接调用 authService 而非 HTTP /api/auth/me，避免 Netlify 私有模式下 Server Component 的 HTTP 回环请求被边缘 401 拦截
 * @returns 用户信息，未登录或接口异常时返回 null
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    const payload = await resolveAuthPayload();
    if (!payload) return null;

    const { authService } = getContainer();
    const user = await authService.getMe(payload.id);
    // toSafeUser 剥离 password/tokenVersion/disabled，结构与前端 User 一致
    return toSafeUser(user) as User;
  } catch {
    return null;
  }
});

/**
 * 获取当前登录用户的 AuthPayload（服务端），供其他服务端数据层复用鉴权结果，避免重复解析 cookie
 */
export const getAuthPayload = cache(resolveAuthPayload);
