/**
 * @file i18n.d.ts — next-intl 全局类型增强
 * @description 以 zh 消息包为基准类型，让 useTranslations/getTranslations 的
 *              key 与参数获得编译期校验（拼写错误直接报 TS 错误）。
 *              Locale 类型从 routing.ts 派生，单一数据源。
 */
import { routing } from './routing';
import zh from './messages/zh';

declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof zh;
  }
}
