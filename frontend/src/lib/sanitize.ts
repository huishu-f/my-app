/**
 * @file sanitize.ts
 * @description 富文本 HTML 客户端安全清洗：基于 DOMPurify 的白名单过滤，DOMPurify 不可用时降级为正则粗过滤；用于编辑器实时预览
 */
import { ALLOWED_ATTR, ALLOWED_TAGS } from '@my-app/shared/lib/sanitize-rules';

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
