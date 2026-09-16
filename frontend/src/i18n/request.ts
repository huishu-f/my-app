/**
 * @file request.ts — next-intl 服务端请求配置
 * @description 从 getRequestConfig 的 locale 参数读取当前语言（由 setRequestLocale 写入）。
 *              不使用 cookies() → 页面可静态渲染/ISR（Full Route Cache 生效）。
 *              setRequestLocale 在 [locale]/layout.tsx 和每个 page 中调用，
 *              将 locale 写入请求级 React cache() 存储，next-intl API 从中读取。
 */
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages = (await import(`./messages/${locale}`)).default;
  return { locale, messages };
});
