/**
 * @file Locale 工具函数
 * @description 提供 Locale 到 HTML lang 属性、Open Graph locale 的展示层映射。
 *              语言列表、默认语言与路由前缀策略统一定义在 routing.ts（单一数据源），
 *              本文件只负责派生类型与映射函数。
 */
import { routing } from './routing';

/** 语言类型（由 routing.locales 派生，避免多处硬编码） */
export type Locale = (typeof routing.locales)[number];

/**
 * 将 Locale 映射为 HTML lang 属性值
 * @param locale 当前语言
 * @returns BCP 47 标签（zh → zh-CN，en → en）
 */
export function htmlLang(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : 'en';
}

/**
 * 将 Locale 映射为 Open Graph locale 字段值
 * @param locale 当前语言
 * @returns Open Graph 规范的 locale（zh → zh_CN，en → en_US）
 */
export function ogLocale(locale: Locale): string {
  return locale === 'zh' ? 'zh_CN' : 'en_US';
}
