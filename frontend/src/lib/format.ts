/**
 * @file format.ts
 * @description 通用格式化工具：头像首字母提取、数字格式化、locale 感知的日期与相对时间格式化
 *              （原 utils.ts 拆分而来，供全站组件使用）
 */
import type { Locale } from '@/i18n/config';

/** locale → Intl 日期格式化 BCP 47 标签 */
const DATE_LOCALE: Record<Locale, string> = { zh: 'zh-CN', en: 'en-US' };

/**
 * 首字母头像 — 从 firstName/lastName 提取 initials
 * @param firstName 名
 * @param lastName 姓
 * @returns 大写的姓名首字母组合，无输入时返回 "U"
 */
export function getInitials(firstName: string, lastName: string): string {
  return ((firstName || '').charAt(0) + (lastName || '').charAt(0)).toUpperCase() || 'U';
}

/**
 * 从全名（空格分隔）拆分出 firstName / lastName，用于 getInitials
 * @param fullName 空格分隔的全名（如 "张 三" 或 "张三"）
 * @returns { firstName, lastName } 元组
 */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  return {
    firstName: fullName.split(' ')[0] || '',
    lastName: fullName.split(' ').slice(1).join(' ') || '',
  };
}

/**
 * 数字格式化 — 千分位逗号分隔，显示完整数字
 * @param n 输入数字
 * @returns 千分位格式化的字符串，如 "1,234,567"
 */
export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * 日期格式化（随 locale）
 * @param dateStr 日期字符串（可被 Date 解析）
 * @param locale 当前语言，默认 zh（中文 "2024年4月5日" / 英文 "April 5, 2024"）
 * @returns 本地化日期字符串
 */
export function formatDate(dateStr: string, locale: Locale = 'zh'): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * 相对时间格式化（随 locale）
 * @param dateStr 日期字符串（可被 Date 解析）
 * @param locale 当前语言，默认 zh
 * @returns 相对时间字符串："刚刚 / x 分钟前 / x 小时前 / x 天前 / x 周前"（en: "just now / x min ago / ..."），超过 30 天返回本地化日期
 */
export function formatRelativeTime(dateStr: string, locale: Locale = 'zh'): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  if (minutes < 1) return locale === 'zh' ? '刚刚' : 'just now';
  if (minutes < 60) return locale === 'zh' ? `${minutes} 分钟前` : `${minutes} min ago`;
  if (hours < 24) return locale === 'zh' ? `${hours} 小时前` : `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return locale === 'zh' ? `${days} 天前` : `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return locale === 'zh' ? `${weeks} 周前` : `${weeks} wk ago`;
  }
  return formatDate(dateStr, locale);
}
