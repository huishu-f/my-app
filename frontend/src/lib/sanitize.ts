/**
 * @file HTML 消毒
 * @description 基于 dompurify 的 HTML 白名单消毒，同时兼容服务端与客户端环境。
 *              标签/属性白名单与服务端 sanitize-html 共享同一份定义，
 *              新增允许的标签或属性只需修改本文件。
 */

/**
 * 允许保留的 HTML 标签白名单
 * @description 与服务端 sanitize-html（markdown.service.ts）共用同一份列表，新增标签只改这里
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
  'input', // markdown 任务列表的 checkbox
] as const;

/**
 * 允许保留的 HTML 属性白名单（用于 DOMPurify 全局配置）
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
 * 消毒 HTML 内容（dompurify 动态加载，兼容 SSR 与客户端）
 * @param html 可能包含恶意脚本的 HTML 字符串
 * @returns 按白名单消毒后的安全 HTML；空输入返回空字符串
 * @warning dompurify 加载失败时回退为正则兜底消毒（移除 script/iframe/object/embed/form/noscript、
 *          事件属性与 javascript: 协议链接），兜底方案的覆盖面弱于 DOMPurify
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
