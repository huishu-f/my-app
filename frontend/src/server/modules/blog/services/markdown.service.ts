/**
 * @file markdown.service.ts
 * @description Markdown 渲染管线：marked 解析 + highlight.js 代码高亮 + sanitize-html 白名单净化，输出安全 HTML；仅服务端使用
 */

import 'server-only';

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

/** 语言标识 → highlight.js 语言模块映射，用于按需注册高亮语言（仅注册这些，避免打包全量语言） */
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

/** marked 单例：启用代码块高亮，高亮结果加 'hljs language-' 前缀类名，供前端 hljs 主题着色 */
const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight: (code, lang) => highlightCode(hljs, code, lang),
  }),
);

marked.setOptions(MARKED_OPTIONS);

/** HTML 净化白名单：限定允许的标签/属性/URL scheme，剥离脚本等危险内容 */
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
    a: (tagName, attribs) => {
      // 非站内锚点（不以 # 开头）视为外链：新窗口打开并加 rel 防护，阻断 opener/noreferrer 泄漏与 SEO 权重传递
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
  disallowedTagsMode: 'escape', // 未授权标签不删除而是转义为可见文本，避免正文内容被静默丢弃
};

/**
 * 将 Markdown 文本渲染为净化后的安全 HTML
 * @param markdown 原始 Markdown 字符串
 * @returns 净化后的 HTML 字符串；入参为空时返回空字符串
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown) return ''; // 空正文直接短路，避免无意义解析

  const rawHtml = marked.parse(markdown, { async: false }) as string; // 同步解析，返回未净化的原始 HTML

  return sanitizeHtml(rawHtml, SANITIZE_OPTIONS); // 按白名单净化后输出
}
