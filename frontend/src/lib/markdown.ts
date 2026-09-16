/**
 * @file Markdown 文本处理纯函数
 * @description 提供 HTML 标签剥离、Markdown 语法剥离与阅读时间估算，
 *              供摘要生成、标题纯文本展示等场景使用（服务端摘要生成亦复用）。
 *              重依赖的 DOMPurify 消毒逻辑已拆分至 sanitize.ts。
 */

/**
 * 去除 HTML 标签并压缩空白
 * @param s 可能包含 HTML 标签的字符串
 * @returns 去除标签后的纯文本，连续空白合并为单个空格
 * @example
 * stripHtml('<p>Hello <b>World</b></p>') // "Hello World"
 */
export function stripHtml(s: string): string {
  return (s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 剥离 Markdown 语法符号得到纯文本
 * @param s 可能包含 Markdown 语法的字符串
 * @returns 去除加粗、斜体、行内代码、删除线、链接、标题、列表等语法后的纯文本；
 *          代码块整体移除，图片仅保留 alt 文本
 * @example
 * stripMarkdown('## 标题 **加粗**') // "标题 加粗"
 */
export function stripMarkdown(s: string): string {
  if (!s) return '';
  return (
    s
      // 代码块整体移除（避免内部内容被后续规则误处理）
      .replace(/```[\s\S]*?```/g, '')
      // 行内代码保留内容
      .replace(/`([^`]+)`/g, '$1')
      // 图片仅保留 alt 文本（须在链接规则前，否则 ![alt](url) 会被链接规则破坏）
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1')
      // 链接仅保留文本
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // 标题符号
      .replace(/^#{1,6}\s+/gm, '')
      // 引用符号
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
      // 斜体（负向前瞻排除加粗场景）
      .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1$2')
      .replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1$2')
      // 删除线
      .replace(/~~([^~]+)~~/g, '$1')
      .trim()
  );
}

/**
 * 估算文章阅读时间
 * @param content 文章内容（可含 HTML 标签，内部先剥离）
 * @returns 预计阅读分钟数，向上取整且最小为 1
 * @description 中文按每分钟 400 字、英文按每分钟 200 词分别计算，取较大值
 */
export function estimateReadingTime(content: string): number {
  const text = stripHtml(content);
  if (!text) return 1;
  // 中文字符数（CJK 统一表意文字 + 扩展A区 + 常用中文标点 + 全角符号）
  const cjkCount = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]/g) || [])
    .length;
  // 英文词数（将中文字符替换为空格后按空白分词）
  const enWords = text
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(cjkCount / 400, enWords / 200);
  return Math.max(1, Math.ceil(minutes));
}
