/**
 * @file i18n.d.ts
 * @description next-intl 类型增强（纯编译期声明，无运行时代码）：Locale 限定为 routing 声明的语言，Messages 以 zh 文案结构为 key 白名单，使 t()/useTranslations 的文案 key 在编译期校验
 */
import { routing } from '@/i18n/routing';
import zh from '@/i18n/messages/zh';

declare module 'next-intl' {
  interface AppConfig {
    /** 合法语言集合，从 routing.locales 派生；使用未声明的 locale 在类型层报错 */
    Locale: (typeof routing.locales)[number];

    /** 文案 key 校验基准：取 zh 汇总入口的完整结构，t() 中不存在的 key 编译期即报错 */
    Messages: typeof zh;
  }
}
