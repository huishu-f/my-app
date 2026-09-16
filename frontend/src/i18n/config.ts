/**
 * @file config.ts — i18n 工具函数
 * @description Locale 工具函数（htmlLang / ogLocale）。
 *              语言列表、默认语言、路由配置统一在 routing.ts 定义，此处仅保留展示层映射。
 */
import { routing } from './routing';

/** 语言类型（从 routing 派生，单一数据源） */
export type Locale = (typeof routing.locales)[number];

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
