/**
 * @file markdown.ts
 * @description Markdown/HTML 文本处理纯函数：去标签、Markdown 剥离、阅读时间估算
 *              重依赖（DOMPurify）已拆分至 sanitize.ts
 */

/**
 * 去除 HTML 标签并合并空白 — 用于摘要等纯文本展示场景
 * @param s 可能含 HTML 标签的字符串
 * @returns 去除标签后的纯文本，多余空白合并为单空格
 */
export function stripHtml(s: string): string {
  return (s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 去除 Markdown 语法符号 — 用于标题、摘要等需要纯文本展示的场景
 * 将 **bold**、*italic*、`code`、~~strike~~、[link](url)、# heading 等 Markdown 语法剥离为纯文本。
 * 同时移除代码块、分割线、任务列表标记（服务端摘要生成复用本函数）。
 * @param s 可能含 Markdown 语法的字符串
 * @returns 去除 Markdown 符号后的纯文本
 */
export function stripMarkdown(s: string): string {
  if (!s) return '';
  return (
    s
      // 代码块整体移除（避免行内内容被后续规则误处理）
      .replace(/```[\s\S]*?```/g, '')
      // 行内代码
      .replace(/`([^`]+)`/g, '$1')
      // 图片保留 alt 文本（必须在链接规则之前，否则 ![alt](url) 会被链接规则破坏）
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1')
      // 链接保留文本
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // 标题
      .replace(/^#{1,6}\s+/gm, '')
      // 引用
      .replace(/^>\s+/gm, '')
      // 分割线（--- / *** / ___）
      .replace(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/gm, '')
      // 无序列表 / 任务列表标记（- item、* item、+ item、- [ ] item）
      .replace(/^[\s]*[-*+]\s+(?:\[[ xX]\]\s+)?/gm, '')
      // 有序列表标记（1. item、1) item）
      .replace(/^[\s]*\d+[.)]\s+/gm, '')
      // 加粗
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      // 斜体（注意排除加粗场景，负向前瞻）
      .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1$2')
      .replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1$2')
      // 删除线
      .replace(/~~([^~]+)~~/g, '$1')
      .trim()
  );
}

/**
 * 估算阅读时间 — 中文按字数 400/分，英文按词数 200/分，取最大值
 * @param content 文章内容（可含 HTML 标签，会自动去除）
 * @returns 预计阅读分钟数，最小为 1
 */
export function estimateReadingTime(content: string): number {
  // 去除 HTML 标签并合并空白
  const text = stripHtml(content);
  if (!text) return 1;
  // 中文字符数（CJK 统一表意文字 + 常见中文标点）
  const cjkCount = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]/g) || [])
    .length;
  // 英文词数
  const enWords = text
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(cjkCount / 400, enWords / 200);
  return Math.max(1, Math.ceil(minutes));
}
