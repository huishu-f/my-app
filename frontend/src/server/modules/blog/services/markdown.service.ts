import 'server-only';

/**
 * @file markdown.service.ts
 * @description Markdown 渲染服务，将 Markdown 文本转为安全的 HTML，防止 XSS 攻击。
 *              使用 marked + marked-highlight + highlight.js 实现代码语法高亮。
 */

import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import sql from 'highlight.js/lib/languages/sql';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import java from 'highlight.js/lib/languages/java';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import shell from 'highlight.js/lib/languages/shell';
import { HIGHLIGHT_ALIASES, MARKED_OPTIONS, highlightCode } from '@/lib/markdown-highlight';

// 注册常用语言（覆盖大部分技术博客需求），未注册的语言回退到 highlightAuto
// 语言别名表与客户端预览（WriteEditor）共用 lib/markdown-highlight.ts，新增语言两处同步
const LANGUAGE_MODULES: Record<string, Parameters<typeof hljs.registerLanguage>[1]> = {
  javascript,
  typescript,
  python,
  bash,
  json,
  xml,
  css,
  sql,
  go,
  rust,
  java,
  yaml,
  markdown,
  shell,
};
for (const [lang, aliases] of Object.entries(HIGHLIGHT_ALIASES)) {
  const mod = LANGUAGE_MODULES[lang];
  if (mod) {
    hljs.registerLanguage(lang, mod);
    for (const alias of aliases) hljs.registerLanguage(alias, mod);
  }
}
import sanitizeHtml from 'sanitize-html';
import { ALLOWED_TAGS } from '@/lib/sanitize';

/**
 * 创建带代码高亮能力的 Marked 实例
 * - markedHighlight 拦截 code block，调用 highlightCode 进行语法高亮
 * - 未知语言时自动检测，失败则原样返回
 */
const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight: (code, lang) => highlightCode(hljs, code, lang),
  }),
);

marked.setOptions(MARKED_OPTIONS);

// sanitize-html 允许的标签和属性白名单（标签集合与客户端 lib/sanitize.ts 共享 ALLOWED_TAGS）
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...ALLOWED_TAGS],
  allowedAttributes: {
    '*': ['class', 'id'],
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    code: ['class', 'data-language'],
    pre: ['class', 'data-language'],
    span: ['class'],
    input: ['type', 'checked', 'disabled'],
    th: ['align'],
    td: ['align'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
  },
  transformTags: {
    // 给外链添加安全属性
    a: (tagName, attribs) => {
      if (attribs.href && !attribs.href.startsWith('#')) {
        return {
          tagName,
          attribs: {
            ...attribs,
            target: '_blank',
            rel: 'noopener noreferrer nofollow',
          },
        };
      }
      return { tagName, attribs };
    },
  },
  disallowedTagsMode: 'escape',
};

/**
 * 将 Markdown 文本渲染为安全的 HTML（含代码语法高亮）
 * @param markdown 原始 Markdown 文本
 * @returns 经过 sanitize 的 HTML 字符串，可直接用于 dangerouslySetInnerHTML
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown) return '';
  // 1. marked 将 Markdown 转为 HTML（含 hljs 代码高亮）
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  // 2. sanitize-html 过滤危险标签和属性（如 <script>, onerror 等）
  return sanitizeHtml(rawHtml, SANITIZE_OPTIONS);
}
