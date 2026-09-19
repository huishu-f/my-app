/**
 * @file locale-params.ts
 * @description `[locale]` 动态段的统一解析：校验语言合法性（非法即 404），并把本次请求的 locale 固定下来。
 *
 * 为什么要收成一处：`params → hasLocale 校验 → setRequestLocale` 这三行此前在 8 个页面/布局里逐字重复 12 次。
 * 重复本身只是噪音，真正的风险是 `setRequestLocale` 漏写不会有任何报错——页面会从「静态预渲染」
 * 悄悄退化成「按请求渲染」（构建产物里 ○ 变 ƒ），只有翻构建产物才发现得了。
 * 收成单一入口后，调用方拿到的必然是「已校验 + 已固定」的 params，漏写这件事在结构上就不可能发生。
 *
 * 返回类型里 locale 是 Locale 而非 string：原写法靠 `hasLocale(...)` 这个类型守卫在调用点把
 * `locale` 收窄成 Locale，收进来之后收窄发生在函数内部，必须靠返回类型把它带出去，
 * 否则调用方传 locale 给 htmlLang/ogLocale 等只接受 Locale 的函数会报类型错。
 */
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/config/i18n';

/**
 * 解析并固定本次请求的 locale
 *
 * 必须在任何 `getTranslations` / `getLocale` 之前调用：异步页面的取数可能先于布局执行，
 * 因此每个页面都要独立调用一次，不能依赖布局里已经调过。
 * @param params Next.js 的 Promise 形式动态段参数，至少含 locale
 * @returns 已通过校验且已 setRequestLocale 的 params（locale 收窄为 Locale，其它动态段如 id 原样保留）
 * @throws locale 不在 routing.locales 内时触发 404（notFound）
 */
export async function resolveLocaleParams<T extends { locale: string }>(
  params: Promise<T>,
): Promise<Omit<T, 'locale'> & { locale: Locale }> {
  const resolved = await params;
  const { locale } = resolved;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return { ...resolved, locale };
}
