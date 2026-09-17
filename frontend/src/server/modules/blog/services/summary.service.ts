/**
 * @file summary.service.ts
 * @description 从文章正文自动生成摘要：剥离 Markdown 语法后截取纯文本；仅服务端使用
 */

import 'server-only';
import { stripMarkdown } from '@/lib/markdown';

/**
 * 由正文生成纯文本摘要
 * @param content 文章 Markdown 正文
 * @returns 最多 100 字的纯文本摘要；正文为空时返回 '（无正文摘要）'；超长时末尾追加 '...'
 */
export function generateSummary(content: string): string {
  const plain = stripMarkdown(content)
    .replace(/\n{2,}/g, ' ') // 连续空行折叠为单个空格，避免摘要出现大段空白
    .trim();

  if (!plain) {
    return '（无正文摘要）';
  }

  const summary = plain.slice(0, 100); // 摘要长度上限：100 字符
  return plain.length > 100 ? `${summary}...` : summary;
}
