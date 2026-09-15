/**
 * @file config.ts — i18n 全局配置
 * @description 支持的语言列表、默认语言、语言偏好 Cookie 名与工具函数。
 *              采用 cookie 存储语言偏好（无 URL 前缀路由），切换后 router.refresh() 全页生效。
 */

/** 支持的语言（新增语言时在此追加，并补齐 messages/<locale>/ 目录） */
export const locales = ['zh', 'en'] as const;

/** 语言类型 */
export type Locale = (typeof locales)[number];

/** 默认语言（无偏好 Cookie 且无法识别浏览器语言时兜底） */
export const defaultLocale: Locale = 'zh';

/** 语言偏好 Cookie 名（proxy 识别浏览器语言时写入、语言切换按钮更新） */
export const LOCALE_COOKIE = 'locale';

/**
 * 判断给定值是否为受支持的语言
 * @param value 待判断值（Cookie / header 解析结果）
 * @returns 是否为合法 Locale
 */
export function isLocale(value: string | null | undefined): value is Locale {
  return locales.includes(value as Locale);
}

/**
 * 将 Locale 映射为 HTML lang 属性值
 * @param locale 语言
 * @returns BCP 47 标签（zh → zh-CN，en → en）
 */
export function htmlLang(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : 'en';
}

/**
 * 将 Locale 映射为 Open Graph locale 字段值
 * @param locale 语言
 * @returns Open Graph locale（zh → zh_CN，en → en_US）
 */
export function ogLocale(locale: Locale): string {
  return locale === 'zh' ? 'zh_CN' : 'en_US';
}
