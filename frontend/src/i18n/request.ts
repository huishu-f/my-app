/**
 * @file next-intl 服务端请求配置
 * @description 服务端获取当前 locale 与对应消息包的统一入口。
 *              关键设计：不读取 cookies()，locale 完全来自 URL（由 setRequestLocale 写入
 *              请求级 React cache 存储），使页面可静态渲染 / ISR（Full Route Cache 生效）。
 *              setRequestLocale 需在 [locale]/layout.tsx 与每个 page.tsx 中调用。
 */
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

/**
 * 服务端请求级 i18n 配置（next-intl 默认入口）
 * @param requestLocale 当前请求的 locale（来自 URL 参数，经 setRequestLocale 写入）
 * @returns { locale, messages }：合法 locale 或回退默认语言，及其对应消息包
 * @example
 * // 每个页面调用 setRequestLocale(locale) 后，next-intl API 自动读取语言
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages = (await import(`./messages/${locale}`)).default;
  return { locale, messages };
});
