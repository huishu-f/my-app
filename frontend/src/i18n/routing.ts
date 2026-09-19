/**
 * @file routing.ts
 * @description 全站 i18n 路由唯一配置源（next-intl defineRouting）：声明支持语言、默认语言与 locale 前缀策略；Locale 类型、导航与请求配置均由此派生，中间件同样消费该配置
 */
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  /** 支持的语言列表，全站 locale 的合法值集合 */
  locales: ['zh', 'en'],

  /** 默认语言：请求未携带合法 locale 时回退到此 */
  defaultLocale: 'zh',

  // 'always'：包括默认语言在内，所有页面路径都强制携带 /zh、/en 前缀（如 /zh/login）
  localePrefix: 'always',
});
