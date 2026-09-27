export const ALLOWED_TAGS = [
  "p",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "mark",
  "sub",
  "sup",
  "a",
  "img",
  "blockquote",
  "q",
  "cite",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "code",
  "pre",
  "kbd",
  "samp",
  "var",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "caption",
  "colgroup",
  "col",
  "div",
  "span",
  "figure",
  "figcaption",
  "details",
  "summary",
  "abbr",
  "address",
  "time",
  "small",
  "input",
] as const;

export function stripHtml(s: string): string {
  return (s || "")
    .replace(/<[^\>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripMarkdown(s: string): string {
  if (!s) return "";
  return s

    .replace(/```[\s\S]*?```/g, "")

    .replace(/`([^`]+)`/g, "$1")

    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, "$1")

    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")

    .replace(/^#{1,6}\s+/gm, "")

    .replace(/^>\s+/gm, "")

    .replace(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/gm, "")

    .replace(/^[\s]*[-*+]\s+(?:\[[ xX]\]\s+)?/gm, "")

    .replace(/^[\s]*\d+[.)]\s+/gm, "")

    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")

    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1$2")
    .replace(/(^|[^_])_([^_]+)_(?!_)/g, "$1$2")

    .replace(/~~([^~]+)~~/g, "$1")
    .trim();
}

export function estimateReadingTime(content: string): number {
  const text = stripHtml(content);
  if (!text) return 1;

  const cjkCount = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]/g) || [])
    .length;

  const enWords = text
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\uff00-\uffef]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const minutes = Math.max(cjkCount / 400, enWords / 200);
  return Math.max(1, Math.ceil(minutes));
}

const HIGHLIGHT_ALIASES: Record<string, string[]> = {
  javascript: ["js"],
  typescript: ["ts"],
  python: ["py"],
  bash: ["sh"],
  xml: ["html"],
  css: [],
  json: [],
  sql: [],
  go: [],
  rust: ["rs"],
  java: [],
  yaml: ["yml"],
  markdown: ["md"],
  shell: ["shell-session", "console"],
};

export const MARKED_OPTIONS = { gfm: true, breaks: true } as const;

export function highlightCode(
  hljs: {
    getLanguage(name: string): unknown;
    highlight(code: string, opts: { language: string }): { value: string };
    highlightAuto(code: string): { value: string };
  },
  code: string,
  lang?: string,
): string {
  const language = lang && hljs.getLanguage(lang) ? lang : "";
  if (language) {
    try {
      return hljs.highlight(code, { language }).value;
    } catch {}
  }
  try {
    return hljs.highlightAuto(code).value;
  } catch {
    return code;
  }
}

export function registerHighlightLanguages<M>(
  hljs: { registerLanguage(name: string, module: M): unknown },
  modules: Record<string, M>,
): void {
  for (const [lang, aliases] of Object.entries(HIGHLIGHT_ALIASES)) {
    const mod = modules[lang];
    if (!mod) continue;
    hljs.registerLanguage(lang, mod);
    for (const alias of aliases) hljs.registerLanguage(alias, mod);
  }
}

export type MarkdownRenderer = (content: string) => Promise<string>;

let markdownRendererPromise: Promise<MarkdownRenderer> | null = null;

export function getMarkdownRenderer(): Promise<MarkdownRenderer> {
  if (markdownRendererPromise) return markdownRendererPromise;
  markdownRendererPromise = (async () => {
    const [
      { marked },
      { default: hljs },
      { default: javascript },
      { default: typescript },
      { default: xml },
      { default: css },
      { default: json },
      { default: bash },
      { default: python },
      { default: sql },
    ] = await Promise.all([
      import("marked"),
      import("highlight.js/lib/core"),
      import("highlight.js/lib/languages/javascript"),
      import("highlight.js/lib/languages/typescript"),
      import("highlight.js/lib/languages/xml"),
      import("highlight.js/lib/languages/css"),
      import("highlight.js/lib/languages/json"),
      import("highlight.js/lib/languages/bash"),
      import("highlight.js/lib/languages/python"),
      import("highlight.js/lib/languages/sql"),
    ]);

    const LANGUAGE_MODULES: Record<string, Parameters<typeof hljs.registerLanguage>[1]> = {
      javascript,
      typescript,
      xml,
      css,
      json,
      bash,
      python,
      sql,
    };

    registerHighlightLanguages(hljs, LANGUAGE_MODULES);

    const renderer = new marked.Renderer();

    renderer.code = ({ text, lang }) => {
      const code = text.replace(/\n$/, "");
      try {
        const highlighted = highlightCode(hljs, code, lang);
        return `<pre><code class="hljs language-${lang || "plaintext"}">${highlighted}</code></pre>`;
      } catch {
        return `<pre><code class="hljs">${code}</code></pre>`;
      }
    };

    marked.setOptions(MARKED_OPTIONS);

    marked.use({ renderer });

    return async (content: string) => {
      return marked.parse(content, { async: false }) as string;
    };
  })();
  return markdownRendererPromise;
}
