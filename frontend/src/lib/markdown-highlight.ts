/**
 * @file markdown-highlight.ts
 * @description Markdown 代码块高亮工具：提供语言别名映射、marked 渲染选项与基于 highlight.js 的高亮函数；不直接依赖具体 hljs 实例，由调用方注入
 */

/** Markdown 围栏语言名 → 常见别名列表 的映射；key 为 highlight.js 注册语言，value 为需归一到该语言的写法（如 js→javascript）。空数组表示该语言无别名，仅作占位记录 */
export const HIGHLIGHT_ALIASES: Record<string, string[]> = {
  javascript: ['js'],
  typescript: ['ts'],
  python: ['py'],
  bash: ['sh'],
  xml: ['html'],
  css: [],
  json: [],
  sql: [],
  go: [],
  rust: ['rs'],
  java: [],
  yaml: ['yml'],
  markdown: ['md'],
  shell: ['shell-session', 'console'],
};

/** marked 渲染选项：gfm 开启 GitHub 风格 Markdown，breaks 将单个换行转为 <br> */
export const MARKED_OPTIONS = { gfm: true, breaks: true } as const;

/**
 * 对代码块做语法高亮，返回 HTML 字符串
 * @param hljs highlight.js 实例（按结构最小化声明所需方法）
 * @param code 待高亮的原始代码
 * @param lang Markdown 围栏声明的语言标识，可选
 * @returns 指定语言可用时高亮该语言；语言未知/高亮异常时自动检测；仍失败则原样返回 code，全程不抛异常
 */
export function highlightCode(
  hljs: {
    getLanguage(name: string): unknown;
    highlight(code: string, opts: { language: string }): { value: string };
    highlightAuto(code: string): { value: string };
  },
  code: string,
  lang?: string,
): string {
  const language = lang && hljs.getLanguage(lang) ? lang : '';
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
