/**
 * @file 鉴权 Cookie 常量
 * @description 集中定义鉴权相关 Cookie 名称，供服务端（auth-cookie.helper / auth.guard / refresh 路由）
 *              与客户端（request.ts / auth-status.ts）共同引用，避免多处硬编码字符串导致命名漂移。
 */

/** JWT 鉴权 Cookie 名称（httpOnly，由后端登录/刷新接口下发） */
export const AUTH_TOKEN_COOKIE = 'auth_token';

/** 前端可读的登录态标记 Cookie（值为 '1'，AuthProvider 据此决定是否请求 /auth/me） */
export const AUTH_STATUS_COOKIE = 'auth_status';
