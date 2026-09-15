/**
 * @file auth-cookies.ts
 * @description 鉴权 Cookie 名称共享常量。
 *              server 端（auth-cookie.helper / auth.guard / refresh route）与
 *              client 端（request.ts / auth-status.ts）共用，避免字符串硬编码漂移。
 */

/** JWT 鉴权 Cookie（httpOnly，后端下发） */
export const AUTH_TOKEN_COOKIE = 'auth_token';

/** 前端可读登录态 Cookie（值为 '1'，用于 AuthProvider 判断是否拉取 /auth/me） */
export const AUTH_STATUS_COOKIE = 'auth_status';
