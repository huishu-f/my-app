/**
 * @file markdown-highlight.ts
 * @description Markdown 代码高亮共享配置：语言别名表 + marked 选项 + 高亮函数。
 *              被 server 端 markdown.service.ts 与 client 端 WriteEditor 预览共同复用，
 *              新增语言只需在此登记别名，并在两端各自 import 对应 hljs 语言模块后按表注册。
 */

/** hljs 语言别名表：key 为注册主名，value 为别名列表（两端共用，新增语言在此登记） */
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

/** marked 全局选项（GFM + 换行），两端保持一致 */
export const MARKED_OPTIONS = { gfm: true, breaks: true } as const;

/**
 * 按语言高亮代码片段
 * @param hljs highlight.js core 实例
 * @param code 代码原文
 * @param lang 语言标识（可选）
 * @returns 高亮后的 HTML，未知语言自动检测，检测失败原样返回
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
      // 指定语言高亮失败时降级为自动检测
    }
  }
  try {
    return hljs.highlightAuto(code).value;
  } catch {
    return code;
  }
}
