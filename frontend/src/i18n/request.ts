/**
 * @file request.ts
 * @description next-intl 服务端请求配置入口（Next.js 约定文件，由框架自动加载）：解析请求语言并动态加载对应 messages；非法 locale 静默回退默认语言，不抛异常
 */
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

/**
 * 请求级 i18n 配置：useLocale/getTranslations/getMessages 在服务端取语言与文案的来源
 * @param requestLocale 中间件检测出的请求语言，为 Promise，可能为空或不受支持
 * @returns locale 最终生效语言；messages 该语言的完整文案树
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  // requestLocale 由中间件解析，可能缺失或不在支持列表；此处兜底回退默认语言而非报错，保证渲染不中断
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  // locale 已经过 hasLocale 白名单校验，动态拼接 import 路径只会命中 messages 下的已知语言文件
  const messages = (await import(`./messages/${locale}`)).default;
  return { locale, messages };
});
