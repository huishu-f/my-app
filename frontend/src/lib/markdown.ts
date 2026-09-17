/**
 * @file markdown.ts
 * @description 富文本/Markdown 转纯文本与阅读时长估算工具；纯函数，用于摘要、SEO 描述等需要剥离标记的场景
 */

/**
 * 剥离 HTML 标签得到纯文本
 * @param s 含 HTML 的字符串，可为空
 * @returns 去掉标签、压缩连续空白并首尾去空格后的文本；入参为空时返回空串
 */
export function stripHtml(s: string): string {
  return (s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 逐条移除 Markdown 语法标记，得到近似纯文本
 * @param s Markdown 源文本，可为空
 * @returns 去除代码块、行内码、图片/链接、标题、引用、分隔线、列表、粗斜体、删除线后的文本；入参为空返回空串
 */
export function stripMarkdown(s: string): string {
  if (!s) return '';
  return (
    s

      // 移除围栏代码块 ```...```
      .replace(/```[\s\S]*?```/g, '')

      // 行内代码 `x` → x
      .replace(/`([^`]+)`/g, '$1')

      // 图片 ![alt](url) → alt
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1')

      // 链接 [text](url) → text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')

      // 标题 #~###### → 去前缀
      .replace(/^#{1,6}\s+/gm, '')

      // 引用 > → 去前缀
      .replace(/^>\s+/gm, '')

      // 分隔线 --- / *** / ___ → 整行删除
      .replace(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/gm, '')

      // 无序列表 - / * / +（含任务复选框 [x]）→ 去前缀
      .replace(/^[\s]*[-*+]\s+(?:\[[ xX]\]\s+)?/gm, '')

      // 有序列表 1. / 1) → 去前缀
      .replace(/^[\s]*\d+[.)]\s+/gm, '')

      // 粗体 **x** / __x__ → x
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')

      // 斜体 *x* / _x_（避开相邻星号/下划线）→ x
      .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1$2')
      .replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1$2')

      // 删除线 ~~x~~ → x
      .replace(/~~([^~]+)~~/g, '$1')
      .trim()
  );
}

/**
 * 估算文章阅读时长（分钟）
 * @param content 文章正文（可含 HTML 标记）
 * @returns 向上取整的分钟数，最少 1 分钟；空内容返回 1
 */
export function estimateReadingTime(content: string): number {
  const text = stripHtml(content);
  if (!text) return 1;

  const cjkCount = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]/g) || [])
    .length;

  const enWords = text
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  // 中文按 400 字/分钟、英文按 200 词/分钟估算，取两者较大值（中英混排按更慢的一方）
  const minutes = Math.max(cjkCount / 400, enWords / 200);
  return Math.max(1, Math.ceil(minutes));
}
