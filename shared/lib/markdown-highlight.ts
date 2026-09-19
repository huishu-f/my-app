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
    } catch {
      // 指定语言高亮失败，落到下方自动检测
    }
  }
  try {
    return hljs.highlightAuto(code).value;
  } catch {
    return code;
  }
}

/**
 * 按 HIGHLIGHT_ALIASES 把语言与其别名一并注册到传入的 hljs 实例。
 *
 * 服务端渲染与编辑器预览各有独立的 hljs 实例（客户端还刻意只动态加载部分语言以控制首屏体积），
 * 所以「注册哪些语言」交由调用方通过 modules 决定；但「怎么注册」只应有这一处实现，
 * 否则两侧各维护一份循环、改一边漏一边，就会出现「编辑器能高亮、文章页不能」的静默不一致。
 *
 * @param hljs highlight.js 实例（按结构最小化声明所需方法）
 * @param modules 语言标识 → 语言模块 的映射；未提供的语言会被跳过
 * @template M 语言模块类型（highlight.js 的 LanguageFn），由调用方推断
 */
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
