/**
 * @file load.ts
 * @description 服务端登录态解析：从鉴权 Cookie 校验 token 并取出当前用户；仅在 RSC/Route Handler 等服务端环境运行（server-only）
 */
import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { getContainer, toSafeUser } from '@my-app/backend/container';
import { AUTH_COOKIE } from '@/lib/request';
import type { AuthPayload, User } from '@my-app/shared';

/**
 * 从请求 Cookie 解析并校验登录态载荷
 * @returns 校验通过的 AuthPayload；无 Cookie、token 非法、用户不存在、tokenVersion 不匹配或账号被禁用时返回 null，不抛异常
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
  // 用户已被删除时 findById 抛错被吞为 undefined，与查无此人同样视为未登录
  if (!dbUser) return null;
  // tokenVersion 与库中不一致说明已改密/被强制下线，旧 token 作废；?? 0 处理字段缺失的存量数据
  if ((dbUser.tokenVersion ?? 0) !== decoded.tokenVersion) return null;
  // 账号被管理员禁用，等同于未登录
  if (dbUser.disabled) return null;

  return decoded;
}

/**
 * 获取当前登录用户（服务端），经 React cache 做单次请求内去重
 * @returns 脱敏后的 User；未登录或解析/校验失败时返回 null，不抛异常
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    // 复用 getAuthPayload：它本身已 cache，同一次请求里再取一次不会重复验签/查库
    const payload = await getAuthPayload();
    if (!payload) return null;

    const { authService } = getContainer();
    const user = await authService.getMe(payload.id);

    // 剥离 password/tokenVersion/disabled 等敏感字段后再返回；SafeUser 结构兼容 User，故断言回 User
    return toSafeUser(user) as User;
  } catch {
    return null;
  }
});

/**
 * 当前请求的登录态载荷，供其它服务端数据函数复用；经 React cache 做请求级去重
 * @returns 同 resolveAuthPayload：有效时返回 AuthPayload，否则 null
 */
export const getAuthPayload = cache(resolveAuthPayload);
