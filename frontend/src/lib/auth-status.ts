/**
 * @file auth-status.ts
 * @description auth_status cookie 操作封装。
 *              auth_status 是前端可读的登录态标记（值为 '1'），
 *              用于 AuthProvider 判断是否需要拉取 /auth/me。
 *              登出/改密/401 失败后需清除该 cookie，避免无效请求。
 *              clearAuthStatus 同时写 localStorage 信号，触发其他标签页 storage 事件同步登出。
 */
import { AUTH_STATUS_COOKIE } from '@/lib/auth-constants';

/** localStorage 信号 key：值变更触发 storage 事件，用于跨标签页同步 */
const LOGOUT_SIGNAL = 'auth_logout_signal';

/** 检查 auth_status cookie 是否存在 */
export function hasAuthStatus(): boolean {
  return document.cookie.includes(`${AUTH_STATUS_COOKIE}=1`);
}

/** 清除 auth_status cookie（登出/改密/401 失败后调用） */
export function clearAuthStatus(): void {
  if (hasAuthStatus()) {
    document.cookie = `${AUTH_STATUS_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
  // 写 localStorage 信号触发其他标签页 storage 事件
  localStorage.setItem(LOGOUT_SIGNAL, Date.now().toString());
}

/** 检查是否有其他标签页发出的登出信号 */
export function wasLogoutSignaled(storageEvent: StorageEvent): boolean {
  return storageEvent.key === LOGOUT_SIGNAL;
}
