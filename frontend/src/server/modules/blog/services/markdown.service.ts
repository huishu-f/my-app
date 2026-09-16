/**
 * @file markdown.service.ts
 * @description Markdown 渲染服务：将文章 Markdown 正文渲染为带代码高亮的安全 HTML。
 *              渲染链路：marked（+ marked-highlight 接入 highlight.js 做语法高亮）
 *              → sanitize-html 白名单过滤，防止 XSS。仅限服务端（server-only）。
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

// 注册常用语言（覆盖大部分技术博客需求），未注册的语言回退到 highlightAuto
// 语言别名表与客户端预览（WriteEditor）共用 lib/markdown-highlight.ts，新增语言两处同步

/**
 * 可注册的代码高亮语言模块表
 * @description key 为主语言名，value 为 highlight.js 语言定义；仅注册此处列出的语言
 */
const LANGUAGE_MODULES: Record<string, Parameters<typeof hljs.registerLanguage>[1]> = {
  /** JavaScript */
  javascript,
  /** TypeScript */
  typescript,
  /** Python */
  python,
  /** Bash */
  bash,
  /** JSON */
  json,
  /** XML/HTML */
  xml,
  /** CSS */
  css,
  /** SQL */
  sql,
  /** Go */
  go,
  /** Rust */
  rust,
  /** Java */
  java,
  /** YAML */
  yaml,
  /** Markdown */
  markdown,
  /** Shell */
  shell,
};
// 按别名表批量注册：主语言与其全部别名共用同一个语言模块
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
 * 带代码高亮能力的 Marked 实例
 * @description markedHighlight 拦截代码块调用 highlightCode 完成语法高亮；
 *              未知语言时自动检测，检测失败则原样返回
 */
const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight: (code, lang) => highlightCode(hljs, code, lang),
  }),
);

marked.setOptions(MARKED_OPTIONS);

/**
 * sanitize-html 过滤配置
 * @description 允许的标签/属性白名单（标签集合与客户端 lib/sanitize.ts 共享 ALLOWED_TAGS）；
 *              外链 a 标签自动补 target/rel 安全属性；禁用标签采用转义而非删除，保留原文文本
 */
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
 * @param markdown 原始 Markdown 文本，空串直接返回空字符串
 * @returns 先经 marked 高亮渲染、再经 sanitize-html 白名单过滤的 HTML 字符串，
 *          可直接用于 dangerouslySetInnerHTML
 * @example
 * renderMarkdown('# Hello\n\n```js\ncode()\n```')
 * @warning 输出虽经白名单过滤，仍应只配合 dangerouslySetInnerHTML 使用，不要再拼接未净化的内容
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown) return '';
  // 1. marked 将 Markdown 转为 HTML（含 hljs 代码高亮）
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  // 2. sanitize-html 过滤危险标签和属性（如 <script>, onerror 等）
  return sanitizeHtml(rawHtml, SANITIZE_OPTIONS);
}
