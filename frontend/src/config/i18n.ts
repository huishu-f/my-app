/**
 * @file i18n.ts
 * @description i18n 语言的类型与展示映射：派生 Locale 联合类型，提供 HTML lang 与 Open Graph locale 标签转换；仅覆盖 routing 中声明的语言
 */
import { routing } from '@/i18n/routing';

/** 支持的语言联合类型，由 routing.locales 派生（'zh' | 'en'） */
export type Locale = (typeof routing.locales)[number];

/**
 * 转换为 HTML lang 属性值
 * @param locale 当前语言
 * @returns <html lang> 使用的语言标签，如 'zh-CN'、'en'
 */
export function htmlLang(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : 'en';
}

/**
 * 转换为 Open Graph locale 值
 * @param locale 当前语言
 * @returns og:locale 使用的语言标签（下划线格式），如 'zh_CN'、'en_US'
 */
export function ogLocale(locale: Locale): string {
  return locale === 'zh' ? 'zh_CN' : 'en_US';
}
