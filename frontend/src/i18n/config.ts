import { routing } from "./routing";

export type Locale = (typeof routing.locales)[number];

export function htmlLang(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : "en";
}

export function ogLocale(locale: Locale): string {
  return locale === "zh" ? "zh_CN" : "en_US";
}
