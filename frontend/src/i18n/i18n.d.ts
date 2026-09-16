/**
 * @file next-intl 全局类型增强
 * @description 以 zh 消息包的结构为基准声明 next-intl 的 Messages 与 Locale 类型，
 *              让 useTranslations / getTranslations 的 key 与参数获得编译期校验
 *              （拼写错误直接报 TS 错误）。Locale 类型从 routing.ts 派生，保持单一数据源。
 */
import { routing } from './routing';
import zh from './messages/zh';

declare module 'next-intl' {
  interface AppConfig {
    /** 支持的语言列表（来自 routing 配置） */
    Locale: (typeof routing.locales)[number];
    /** 消息结构类型（以 zh 语言包为基准） */
    Messages: typeof zh;
  }
}
