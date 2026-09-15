/**
 * @file sanitize.ts
 * @description HTML 消毒工具，使用 dompurify 支持 SSR 和客户端。
 *              标签/属性白名单与 server 端 sanitize-html（markdown.service.ts）共享 ALLOWED_TAGS，
 *              新增标签只需改这一处。
 */

/**
 * 允许的 HTML 标签白名单（与 server 端 sanitize-html 共用同一份定义，新增标签只改这里）
 */
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
  'input', // checkbox 列表（markdown 任务列表）
] as const;

/**
 * 允许的 HTML 属性白名单（DOMPurify 全局配置）
 */
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
 * 使用 dompurify，支持服务端和客户端
 * @param html 可能含恶意脚本的 HTML 字符串
 * @returns 消毒后的安全 HTML
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
