/**
 * @file 登录态 Cookie 操作
 * @description 封装前端可读的 auth_status Cookie（值为 '1'）的读取与清除。
 *              AuthProvider 用它判断是否需要请求 /auth/me；登出、改密、401 刷新失败后
 *              必须清除该 Cookie，避免带着失效状态继续发起无效请求。
 *              清除时同时写 localStorage 信号，借助 storage 事件让其他标签页同步登出。
 */
import { AUTH_STATUS_COOKIE } from '@/lib/auth-constants';

/** localStorage 跨标签页登出信号 key：每次写入新值触发其他标签页的 storage 事件 */
const LOGOUT_SIGNAL = 'auth_logout_signal';

/**
 * 检查登录态 Cookie 是否存在
 * @returns auth_status=1 存在时返回 true
 */
export function hasAuthStatus(): boolean {
  return document.cookie.includes(`${AUTH_STATUS_COOKIE}=1`);
}

/**
 * 清除登录态 Cookie 并广播跨标签页登出信号
 * @description 仅在 Cookie 存在时执行删除；随后向 localStorage 写入时间戳信号，
 *              其他标签页监听到该信号后执行同步登出。
 */
export function clearAuthStatus(): void {
  if (hasAuthStatus()) {
    document.cookie = `${AUTH_STATUS_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  }
  localStorage.setItem(LOGOUT_SIGNAL, Date.now().toString());
}

/**
 * 判断 storage 事件是否为其他标签页发出的登出信号
 * @param storageEvent 浏览器 storage 事件对象
 * @returns key 匹配登出信号时返回 true
 */
export function wasLogoutSignaled(storageEvent: StorageEvent): boolean {
  return storageEvent.key === LOGOUT_SIGNAL;
}
