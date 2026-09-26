"use client";

import { ERROR_PAGE_CSS, errorShellStyle, errorTitleStyle, errorDescStyle } from "./errorPageShell";

const copy = {
  zh: {
    title: "404",
    desc: "你访问的页面不存在或已被移动。",
    goHome: "返回首页",
    browsePosts: "浏览文章",
  },
  en: {
    title: "404",
    desc: "The page you are looking for does not exist or has been moved.",
    goHome: "Go home",
    browsePosts: "Browse posts",
  },
} as const;

const linkBaseStyle = {
  height: "40px",
  padding: "0 20px",
  borderRadius: "10px",
  fontSize: "14px",
  fontWeight: "500",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
} as const;

export default function GlobalNotFound() {
  const lang =
    typeof window !== "undefined" && window.location.pathname.startsWith("/en") ? "en" : "zh";
  const t = copy[lang];

  return (
    <html lang={lang === "en" ? "en" : "zh-CN"}>
      <body className="antialiased">
        <style>{ERROR_PAGE_CSS}</style>

        <div
          className="flex min-h-screen flex-col items-center justify-center text-center"
          style={errorShellStyle}
        >
          <h1 style={errorTitleStyle}>{t.title}</h1>
          <p style={errorDescStyle}>{t.desc}</p>

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px" }}>
            <a
              href={lang === "en" ? "/en" : "/zh"}
              style={{
                ...linkBaseStyle,
                background: "var(--color-accent)",
                color: "var(--color-page)",
              }}
            >
              {t.goHome}
            </a>
            <a
              href={lang === "en" ? "/en/posts" : "/zh/posts"}
              style={{
                ...linkBaseStyle,
                border: "1px solid var(--color-stroke-strong)",
                color: "var(--color-body)",
              }}
            >
              {t.browsePosts}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
