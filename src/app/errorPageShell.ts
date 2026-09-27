export const ERROR_PAGE_CSS = `
  :root {
    --color-page: oklch(0.982 0 0);          /* = --background */
    --color-body: oklch(0.145 0 0);          /* = --foreground */
    --color-muted: oklch(0.535 0 0);         /* = --muted-foreground */
    --color-heading: oklch(0.145 0 0);       /* = --foreground */
    --color-surface: oklch(0.965 0 0);       /* = --muted */
    --color-stroke: oklch(0.885 0 0);        /* = --border */
    --color-stroke-strong: oklch(0.84 0 0);  /* = --border-strong = --input */
    --color-accent: oklch(0.205 0 0);        /* = --primary */
    --color-state-error: oklch(0.53 0.16 27); /* = --destructive */
    --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text",
      "Segoe UI", "PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei UI", "Microsoft YaHei",
      "Noto Sans SC", "Source Han Sans SC", sans-serif;
  }
  .dark {
    --color-page: oklch(0.145 0 0);
    --color-body: oklch(0.985 0 0);
    --color-muted: oklch(0.708 0 0);
    --color-heading: oklch(0.985 0 0);
    --color-surface: oklch(0.269 0 0);
    --color-stroke: oklch(1 0 0 / 16%);
    --color-stroke-strong: oklch(1 0 0 / 24%);
    --color-accent: oklch(0.922 0 0);
    --color-state-error: oklch(0.72 0.13 25); /* = --destructive */
  }
  /* 错误页不加载 Tailwind，居中与配色全部自带，不依赖任何工具类 */
  body {
    margin: 0;
    background: var(--color-page);
    color: var(--color-body);
  }
`;

export const errorShellStyle = {
  fontFamily: "var(--font-sans)",
  padding: "2rem",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  textAlign: "center",
} as const;

export const errorTitleStyle = {
  color: "var(--color-heading)",
  fontSize: "clamp(38px, 8vw, 48px)",
  fontWeight: "bold",
  lineHeight: "1.1",
  marginBottom: "1rem",
  letterSpacing: "-0.02em",
} as const;

export const errorDescStyle = {
  color: "var(--color-muted)",
  fontSize: "16px",
  lineHeight: "1.6",
  marginBottom: "2rem",
  maxWidth: "400px",
} as const;
