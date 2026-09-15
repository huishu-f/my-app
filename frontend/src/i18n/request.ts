/**
 * @file request.ts — next-intl 服务端请求配置
 * @description 每次服务端渲染时解析当前语言（Cookie 偏好 > 默认 zh）并加载对应消息包。
 *              注意：读取 cookies() 使使用文案的页面转为动态渲染（i18n 按用户偏好渲染的必要代价）。
 */
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, defaultLocale, isLocale } from './config';

/** 语言 → 消息包加载器（显式映射，便于打包器静态分析与 tree-shaking） */
const messageLoaders: Record<string, () => Promise<{ default: object }>> = {
  zh: () => import('./messages/zh'),
  en: () => import('./messages/en'),
};

/**
 * next-intl 请求配置：解析 locale 并返回消息包
 * @returns {locale, messages} 供 RSC 与 NextIntlClientProvider 消费
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const requested = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(requested) ? requested : defaultLocale;
  const messages = (await messageLoaders[locale]()).default;

  return { locale, messages };
});
