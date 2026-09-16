/**
 * @file routing.ts — next-intl 路由配置
 * @description 定义支持的语言列表、默认语言与 URL 前缀策略（always：所有路由带 /zh /en 前缀）。
 *              locale 从 URL 参数获取，不读 cookies() → 页面可静态渲染/ISR。
 */
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
  localePrefix: 'always',
});
