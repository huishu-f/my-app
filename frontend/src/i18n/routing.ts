/**
 * @file next-intl 路由配置
 * @description 定义站点支持的语言列表、默认语言与 URL 前缀策略。
 *              locale 只从 URL 获取、不读 cookies()，保证页面可静态渲染 / ISR。
 *              localePrefix: 'always' 表示所有路由显式携带 /zh、/en 前缀。
 */
import { defineRouting } from 'next-intl/routing';

/** next-intl 路由配置（单一数据源：语言列表与默认语言由此导出） */
export const routing = defineRouting({
  /** 支持的语言列表 */
  locales: ['zh', 'en'],
  /** 默认语言（URL 无前缀时重定向到此语言） */
  defaultLocale: 'zh',
  /** 所有路由始终带 locale 前缀 */
  localePrefix: 'always',
});
