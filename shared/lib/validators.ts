/**
 * @file validators.ts
 * @description 表单字段校验工具集：邮箱/用户名/密码合法性、图片外链白名单校验；纯函数，规则与后端保持一致
 */

/** 邮箱格式：本地与域名各非空且以 . 分隔顶层域，允许下划线等常规字符 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 用户名格式：仅限字母数字下划线，长度 3–30 */
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

/**
 * 校验邮箱格式是否合法（比较前对首尾空格做 trim）
 * @param email 待校验邮箱
 * @returns 合法返回 true
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/**
 * 校验用户名是否合法：仅字母数字下划线、长度 3–30（比较前 trim）
 * @param username 待校验用户名
 * @returns 合法返回 true
 */
export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username.trim());
}

/**
 * 校验密码长度是否在 6–128 之间
 * @param password 待校验密码
 * @returns 长度合规返回 true
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 6 && password.length <= 128;
}

/** 允许作为文章封面/插图的图片外链可信域名白名单 */
export const ALLOWED_IMAGE_HOSTS: readonly string[] = [
  'images.unsplash.com',
  'images.pexels.com',
  'n.colorhub.me',
];

/**
 * 生成可信图片域名列表的可读文案
 * @returns 以 " / " 连接的域名串，用于表单提示语
 */
export function allowedImageHostsLabel(): string {
  return ALLOWED_IMAGE_HOSTS.join(' / ');
}

/**
 * 校验图片 URL 是否安全：必须是 https 协议且域名命中白名单
 * @param src 图片地址
 * @returns 合法可信返回 true；URL 无法解析时返回 false
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
