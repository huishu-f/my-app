/**
 * @file validators.ts
 * @description 前端通用表单校验工具函数，消除 login/register 页面的重复校验逻辑。
 */

/** 邮箱格式正则（与后端 Zod schema 保持一致） */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 用户名格式正则（字母、数字、下划线，3-30 字符） */
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

/**
 * 校验邮箱格式是否合法
 * @param email 待校验的邮箱字符串
 * @returns 合法返回 true
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/**
 * 校验用户名格式是否合法
 * @param username 待校验的用户名
 * @returns 合法返回 true
 */
export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username.trim());
}

/**
 * 校验密码长度是否合法（6-128 位）
 * @param password 待校验的密码
 * @returns 合法返回 true
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 6 && password.length <= 128;
}

/**
 * next/image 允许加载的远程图片域名白名单。
 * 注意：必须与 frontend/next.config.ts 的 images.remotePatterns 保持一致，新增域名时两处同步修改。
 */
const ALLOWED_IMAGE_HOSTS = ['images.unsplash.com', 'images.pexels.com', 'n.colorhub.me'];

/**
 * 校验图片 URL 能否安全交给 next/image 渲染。
 * 防止非法 URL（如 "not-a-url"）或未配置域名（如 example.com）传入 next/image，
 * 触发 "Invalid src prop" / "next-image-unconfigured-host" 渲染异常导致页面崩溃。
 * @param src 原始图片地址
 * @returns 可安全渲染返回 true，否则返回 false
 */
export function isSafeImageUrl(src: string): boolean {
  try {
    const url = new URL(src);
    if (url.protocol !== 'https:') return false;
    return ALLOWED_IMAGE_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}
