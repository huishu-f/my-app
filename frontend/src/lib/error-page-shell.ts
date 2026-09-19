/**
 * @file error-page-shell.ts
 * @description 根级错误页（global-error / not-found）共用的离线设计令牌与页面壳样式：两页均脱离全局布局，
 * 不加载 Tailwind 与 globals.css，配色与排版全靠这份共享的内联样式，避免两份拷贝各自漂移
 */

/** 离线设计令牌（light/dark 双套），取值与 globals.css 的 tokens 保持同值 */
export const ERROR_PAGE_CSS = `
  :root {
    --color-page: #fafafa;
    --color-body: #4b4b54;
    --color-muted: #5e5e68;
    --color-heading: #1f1f23;
    --color-surface: #efeff1;
    --color-stroke: #e4e4e7;
    --color-stroke-strong: #bcbcc4;
    --color-accent: #09090b;
    --color-state-error: #a33930;
    --font-sans: ui-sans-serif, system-ui, -apple-system, 'Noto Sans SC', sans-serif;
  }
  .dark {
    --color-page: #0a0a0b;
    --color-body: #a1a1aa;
    --color-muted: #9a9aa3;
    --color-heading: #ececef;
    --color-surface: #141417;
    --color-stroke: #26262c;
    --color-stroke-strong: #3a3a46;
    --color-accent: #fafafa;
    --color-state-error: #e07878;
  }
  /* 错误页不加载 Tailwind，居中与配色全部自带，不依赖任何工具类 */
  body {
    margin: 0;
    background: var(--color-page);
    color: var(--color-body);
  }
`;

/** 居中页面壳的容器样式 */
export const errorShellStyle = {
  fontFamily: 'var(--font-sans)',
  padding: '2rem',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  textAlign: 'center',
} as const;

/** 大标题样式 */
export const errorTitleStyle = {
  color: 'var(--color-heading)',
  fontSize: 'clamp(38px, 8vw, 48px)',
  fontWeight: 'bold',
  lineHeight: '1.1',
  marginBottom: '1rem',
  letterSpacing: '-0.02em',
} as const;

/** 说明文字样式 */
export const errorDescStyle = {
  color: 'var(--color-muted)',
  fontSize: '16px',
  lineHeight: '1.6',
  marginBottom: '2rem',
  maxWidth: '400px',
} as const;
