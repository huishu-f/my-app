/**
 * @file format.ts
 * @description 展示格式化工具集：姓名缩写、千分位计数、绝对/相对日期；纯函数无副作用，日期基于运行环境本地时区
 */

import type { Locale } from '@/i18n/config';

/** 应用 Locale → Intl.DateTimeFormat 使用的 BCP-47 语言标签 */
const DATE_LOCALE: Record<Locale, string> = { zh: 'zh-CN', en: 'en-US' };

/**
 * 取头像展示用的单字：优先名字首字符，名为空回退姓氏首字符
 * @param firstName 名
 * @param lastName 姓
 * @returns 单个字符（latin 大写、CJK 原样）；两者皆空时兜底返回 'U'
 */
export function getInitials(firstName: string, lastName: string): string {
  const name = (firstName || lastName || '').trim();
  return (name.charAt(0) || 'U').toUpperCase();
}

/**
 * 按空格拆分全名为名与姓
 * @param fullName 完整姓名
 * @returns firstName 取第一段，lastName 取其余拼接；无空格时 lastName 为空串
 */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  return {
    firstName: fullName.split(' ')[0] || '',
    lastName: fullName.split(' ').slice(1).join(' ') || '',
  };
}

/**
 * 千分位格式化数字（如 1234 → '1,234'）
 * @param n 待格式化数值
 * @returns 固定按 en-US 分组规则格式化，不随语言变化
 */
export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * 将日期字符串格式化为"年月日"长文本
 * @param dateStr 可被 new Date 解析的日期字符串
 * @param locale 输出语言，默认 'zh'
 * @returns 本地化后的日期文本；无法解析时原样返回入参 dateStr
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
 * 将日期字符串格式化为相对时间（"X 分钟前/小时前/天前/周前"）
 * @param dateStr 可被 new Date 解析的日期字符串
 * @param locale 输出语言，默认 'zh'
 * @returns 依距今时长分档；无法解析时原样返回入参；超过 30 天回退为绝对日期
 */
export function formatRelativeTime(dateStr: string, locale: Locale = 'zh'): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const diff = Date.now() - d.getTime();
  // 60_000 = 一分钟毫秒数；3_600_000 = 一小时毫秒数，用于把毫秒差换算成分/时
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  // 分档阈值：1 分钟内视为"刚刚"，逐级到分钟/小时；24 小时内按小时，7 天内按天，30 天内按周
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
