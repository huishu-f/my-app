"use client";

import { useEffect } from "react";
import { ERROR_PAGE_CSS, errorShellStyle, errorTitleStyle, errorDescStyle } from "./errorPageShell";

const RELOAD_CSS = `
  /* 主按钮的交互反馈：hover 只做明度变化，focus 走 2px 主色描边（与全站按钮规则一致） */
  .ge-reload:hover {
    opacity: 0.9;
  }
  .ge-reload:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
`;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isEn = typeof window !== "undefined" && window.location.pathname.startsWith("/en");

  const copy = isEn
    ? {
        title: "Something went wrong",
        desc: "A critical error occurred. Try reloading — if the problem persists, please try again later.",
        reload: "Reload",
      }
    : {
        title: "出错了",
        desc: "应用发生了严重错误。请尝试重新加载，如果问题持续出现请稍后再试。",
        reload: "重新加载",
      };

  return (
    <html lang={isEn ? "en" : "zh-CN"}>
      <body className="antialiased">
        <style>{ERROR_PAGE_CSS + RELOAD_CSS}</style>

        <div
          className="flex min-h-screen flex-col items-center justify-center text-center"
          style={errorShellStyle}
        >
          <h1 style={errorTitleStyle}>{copy.title}</h1>
          <p style={errorDescStyle}>{copy.desc}</p>

          <button
            onClick={reset}
            className="ge-reload"
            style={{
              height: "40px",
              padding: "0 20px",
              borderRadius: "10px",
              border: "1px solid var(--color-stroke-strong)",
              background: "var(--color-accent)",
              color: "var(--color-page)",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "opacity var(--duration-fast) var(--ease-smooth)",
            }}
          >
            {copy.reload}
          </button>
        </div>
      </body>
    </html>
  );
}
