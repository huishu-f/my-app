/**
 * @file auth-constants.ts
 * @description 前端鉴权相关 Cookie 名称常量，供请求层、middleware 与客户端统一引用；集中定义避免各处硬编码字符串不一致
 */

/** 登录 token 所在 Cookie 名，前后端共用的哨兵字符串，改动须与后端 Set-Cookie 保持一致 */
export const AUTH_TOKEN_COOKIE = 'auth_token';

/** 登录状态标记 Cookie 名，值为 '1' 表示已登录；供客户端/middleware 快速判断是否需要携带鉴权信息 */
export const AUTH_STATUS_COOKIE = 'auth_status';
