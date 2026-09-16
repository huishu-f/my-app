/**
 * @file 通用格式化工具
 * @description 提供头像首字母提取、姓名拆分、数字千分位、
 *              以及随 locale 切换的日期与相对时间格式化，供全站组件复用。
 */
import type { Locale } from '@/i18n/config';

/** locale → Intl 所需 BCP 47 语言标签映射 */
const DATE_LOCALE: Record<Locale, string> = { zh: 'zh-CN', en: 'en-US' };

/**
 * 提取姓名首字母用于头像占位
 * @param firstName 名
 * @param lastName 姓
 * @returns 大写的首字母组合（如 "ZS"）；两者均为空时返回 "U"（Unknown）
 * @example
 * getInitials('三', '张') // "SZ"
 */
export function getInitials(firstName: string, lastName: string): string {
  return ((firstName || '').charAt(0) + (lastName || '').charAt(0)).toUpperCase() || 'U';
}

/**
 * 将空格分隔的全名拆分为名与姓
 * @param fullName 全名字符串（如 "张 三" 或单段 "张三"）
 * @returns 拆分结果：首段为 firstName，其余合并为 lastName
 * @example
 * splitName('张 三') // { firstName: '张', lastName: '三' }
 */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  return {
    firstName: fullName.split(' ')[0] || '',
    lastName: fullName.split(' ').slice(1).join(' ') || '',
  };
}

/**
 * 数字千分位格式化
 * @param n 输入数字
 * @returns 千分位逗号分隔的字符串（如 "1,234,567"），始终显示完整数字
 */
export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * 日期格式化（随 locale 输出本地化长格式）
 * @param dateStr 可被 Date 解析的日期字符串
 * @param locale 当前语言，默认 zh（中文 "2024年4月5日" / 英文 "April 5, 2024"）
 * @returns 本地化日期字符串；无法解析时原样返回
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
 * @param dateStr 可被 Date 解析的日期字符串
 * @param locale 当前语言，默认 zh
 * @returns 相对时间文案：刚刚 / x 分钟前 / x 小时前 / x 天前 / x 周前
 *          （英文对应 just now / x min ago / x hr ago / x days ago / x wk ago）；
 *          超过 30 天回退为本地化日期格式；无法解析时原样返回
 * @example
 * formatRelativeTime('2026-09-16T00:00:00Z') // "刚刚"（假设当前时间很接近）
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
