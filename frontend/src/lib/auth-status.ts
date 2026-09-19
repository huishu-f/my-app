/**
 * @file auth-status.ts
 * @description 客户端登录状态工具：读取/清除 auth_status Cookie 并广播登出信号；依赖 document/localStorage，仅在浏览器端调用
 */

import { AUTH_STATUS_COOKIE } from '@my-app/shared/lib/auth-constants';

/** localStorage 哨兵 key，用于跨标签页广播"已登出"信号，写入值为触发时刻的时间戳 */
const LOGOUT_SIGNAL = 'auth_logout_signal';

/**
 * 读取 auth_status Cookie 判断当前是否已登录
 * @returns Cookie 中存在 `auth_status=1` 时为 true
 */
export function hasAuthStatus(): boolean {
  return document.cookie.includes(`${AUTH_STATUS_COOKIE}=1`);
}

/**
 * 清除登录状态：过期 auth_status Cookie 并写入登出信号
 * 无论 Cookie 是否存在都会写 localStorage 信号，以便其他标签页通过 storage 事件同步登出
 */
export function clearAuthStatus(): void {
  if (hasAuthStatus()) {
    document.cookie = `${AUTH_STATUS_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
  localStorage.setItem(LOGOUT_SIGNAL, Date.now().toString());
}

/**
 * 判断某个 storage 事件是否来自其他标签页的登出广播
 * @param storageEvent 浏览器 storage 事件对象
 * @returns 事件 key 命中登出信号时为 true
 */
export function wasLogoutSignaled(storageEvent: StorageEvent): boolean {
  return storageEvent.key === LOGOUT_SIGNAL;
}
