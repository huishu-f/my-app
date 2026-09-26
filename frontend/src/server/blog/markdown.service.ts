import "server-only";

import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import sql from "highlight.js/lib/languages/sql";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import java from "highlight.js/lib/languages/java";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";
import shell from "highlight.js/lib/languages/shell";
import {
  MARKED_OPTIONS,
  highlightCode,
  registerHighlightLanguages,
  ALLOWED_TAGS,
} from "@/lib/markdown";
import sanitizeHtml from "sanitize-html";

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

registerHighlightLanguages(hljs, LANGUAGE_MODULES);

const marked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight: (code, lang) => highlightCode(hljs, code, lang),
  }),
);

marked.setOptions(MARKED_OPTIONS);

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...ALLOWED_TAGS],
  allowedAttributes: {
    "*": ["class", "id"],
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    code: ["class", "data-language"],
    pre: ["class", "data-language"],
    span: ["class"],
    input: ["type", "checked", "disabled"],
    th: ["align"],
    td: ["align"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
  transformTags: {
    a: (tagName, attribs) => {
      if (attribs.href && !attribs.href.startsWith("#")) {
        return {
          tagName,
          attribs: {
            ...attribs,
            target: "_blank",
            rel: "noopener noreferrer nofollow",
          },
        };
      }
      return { tagName, attribs };
    },
  },
  disallowedTagsMode: "escape",
};

export function renderMarkdown(markdown: string): string {
  if (!markdown) return "";

  const rawHtml = marked.parse(markdown, { async: false }) as string;

  return sanitizeHtml(rawHtml, SANITIZE_OPTIONS);
}
