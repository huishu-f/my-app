/**
 * @file sanitize.ts
 * @description 富文本 HTML 安全清洗：基于 DOMPurify 的标签/属性白名单过滤，含 SSR 不可用时的正则降级；用于渲染用户提交的图文内容防 XSS
 */

/** DOMPurify 允许保留的标签白名单；含 table/pre/code 等排版标签，input 用于任务清单复选框 */
export const ALLOWED_TAGS = [
  'p',
  'br',
  'hr',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'del',
  'mark',
  'sub',
  'sup',
  'a',
  'img',
  'blockquote',
  'q',
  'cite',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'code',
  'pre',
  'kbd',
  'samp',
  'var',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'caption',
  'colgroup',
  'col',
  'div',
  'span',
  'figure',
  'figcaption',
  'details',
  'summary',
  'abbr',
  'address',
  'time',
  'small',
  'input',
] as const;

/** DOMPurify 允许保留的属性白名单；覆盖超链接、图片、表格跨度及代码块 data-language 等，不含任何 on* 事件属性 */
export const ALLOWED_ATTR = [
  'href',
  'src',
  'alt',
  'title',
  'class',
  'id',
  'width',
  'height',
  'colspan',
  'rowspan',
  'target',
  'rel',
  'download',
  'datetime',
  'cite',
  'start',
  'type',
  'value',
  'open',
  'data-language',
  'checked',
  'disabled',
] as const;

/**
 * 清洗富文本 HTML，去除脚本与危险属性以防 XSS
 * @param html 待清洗的 HTML 字符串，可为空
 * @returns 净化后的 HTML；入参为空时返回空串
 * @remarks 动态 import DOMPurify（依赖 DOM，仅客户端可用）。DOMPurify 加载/执行失败时降级为正则粗过滤，
 * 移除 script/iframe/object/embed/form/noscript、内联事件属性与 javascript:/vbscript: 协议；正则过滤强度弱于 DOMPurify，仅作兜底。
 */
export async function sanitizeArticleContent(html: string): Promise<string> {
  if (!html) return '';
  try {
    const { default: DOMPurify } = await import('dompurify');
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [...ALLOWED_TAGS],
      ALLOWED_ATTR: [...ALLOWED_ATTR],
      ALLOW_DATA_ATTR: true,
    });
  } catch {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/<object[\s\S]*?<\/object>/gi, '')
      .replace(/<embed[\s\S]*?<\/embed>/gi, '')
      .replace(/<form[\s\S]*?<\/form>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(href|src)\s*=["']\s*(?:javascript|vbscript):[^"']*["']/gi, '');
  }
}
