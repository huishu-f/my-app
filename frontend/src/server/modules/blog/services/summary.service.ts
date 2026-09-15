import 'server-only';
import { stripMarkdown } from '@/lib/markdown';

/**
 * @file summary.service.ts
 * @description 文章摘要生成工具，从 Markdown 正文中提取纯文本并截取摘要
 */

/**
 * 生成文章摘要（纯函数，无副作用）
 *
 * 规则：
 * 1. 移除 Markdown 语法（标题、加粗/斜体、链接保留文本、图片移除、代码移除）
 * 2. 将连续换行替换为单个空格
 * 3. 截取前 100 个字符
 * 4. 原文本长度超过 100 时追加省略号
 * 5. 清理后为空则回退为默认文案
 *
 * @param content 文章 Markdown 原文
 * @returns 摘要字符串（最长约 100 字符）
 */
export function generateSummary(content: string): string {
  const plain = stripMarkdown(content)
    .replace(/\n{2,}/g, ' ')
    .trim();

  if (!plain) {
    return '（无正文摘要）';
  }

  const summary = plain.slice(0, 100);
  return plain.length > 100 ? `${summary}...` : summary;
}
