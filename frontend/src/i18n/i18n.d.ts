/**
 * @file i18n.d.ts — next-intl 全局类型增强
 * @description 以 zh 消息包为基准类型，让 useTranslations/getTranslations 的
 *              key 与参数获得编译期校验（拼写错误直接报 TS 错误）。
 */
import zh from './messages/zh';

declare module 'next-intl' {
  interface AppConfig {
    Locale: 'zh' | 'en';
    Messages: typeof zh;
  }
}
