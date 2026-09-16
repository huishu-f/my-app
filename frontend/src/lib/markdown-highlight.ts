/**
 * @file Markdown 代码高亮共享配置
 * @description 集中维护 highlight.js 语言别名表、marked 选项与高亮函数，
 *              供服务端 markdown 渲染与客户端编辑器预览两端复用。
 *              新增语言只需在别名表登记，并在两端各自 import 对应语言模块后注册。
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

/** marked 渲染选项（GFM 表格 + 换行转 <br>），两端保持一致以预览即所得 */
export const MARKED_OPTIONS = { gfm: true, breaks: true } as const;

/**
 * 按指定语言高亮代码片段
 * @param hljs highlight.js 实例（支持 getLanguage / highlight / highlightAuto）
 * @param code 代码原文
 * @param lang 代码块声明的语言标识（可选）
 * @returns 高亮后的 HTML；指定语言不可用或高亮失败时降级为自动检测，自动检测也失败时原样返回
 * @example
 * highlightCode(hljs, 'const a = 1', 'ts')
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
      // 指定语言高亮抛错时降级为自动检测
    }
  }
  try {
    return hljs.highlightAuto(code).value;
  } catch {
    return code;
  }
}
