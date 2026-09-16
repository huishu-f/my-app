/**
 * @file global-error.tsx
 * @description 全局错误边界，捕获根布局级别（layout.tsx）的渲染错误；
 *              因 Provider 链可能已崩溃，无法使用 next-intl，此处按 URL 前缀做轻量双语，
 *              且必须自带 <html>/<body> 结构与内联样式，不依赖任何全局 CSS。
 */
'use client';

import { useEffect } from 'react';

/**
 * GlobalError 根级全局错误页
 * @param props.error 捕获到的错误对象（含可选 digest 摘要）
 * @param props.reset 重置错误边界并尝试重新渲染的函数，绑定到「重新加载」按钮
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  /**
   * 渲染出错时输出错误日志到控制台
   */
  useEffect(() => {
    console.error(error);
  }, [error]);

  /**
   * 轻量双语判定：客户端读取路径前缀判断是否英文站
   * （global-error 渲染时 next-intl Provider 链可能已崩溃，只能直读 URL）
   */
  const isEn =
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/en');
  /** 当前语言的文案集合（标题/描述/按钮） */
  /** 当前语言的文案集合（标题/描述/按钮） */
  const copy = isEn
    ? {
        title: 'Something went wrong',
        desc: 'A critical error occurred. Try reloading — if the problem persists, please try again later.',
        reload: 'Reload',
      }
    : {
        title: '出错了',
        desc: '应用发生了严重错误。请尝试重新加载，如果问题持续出现请稍后再试。',
        reload: '重新加载',
      };

  return (
    <html lang={isEn ? 'en' : 'zh-CN'}>
      <body className="antialiased">
        {/* 内联定义明/暗两套 CSS 变量，脱离 globals.css 独立成活 */}
        <style>{`
          :root {
            --color-page: #ffffff;
            --color-body: #52525b;
            --color-muted: #71717a;
            --color-heading: #1f1f23;
            --color-surface: #f3f4f6;
            --color-stroke: #e5e7eb;
            --color-stroke-strong: #b8bdc7;
            --color-accent: #09090b;
            --color-state-error: #b84238;
            --font-sans: ui-sans-serif, system-ui, -apple-system, 'Noto Sans SC', sans-serif;
          }
          .dark {
            --color-page: #0a0a0b;
            --color-body: #a1a1aa;
            --color-muted: #71717a;
            --color-heading: #ececef;
            --color-surface: #141417;
            --color-stroke: #1e1e24;
            --color-stroke-strong: #2e2e36;
            --color-accent: #fafafa;
            --color-state-error: #e07878;
          }
        `}</style>
        <div
          className="flex min-h-screen flex-col items-center justify-center text-center"
          style={{ fontFamily: 'var(--font-sans)', padding: '2rem' }}
        >
          <h1
            className="text-heading"
            style={{
              fontSize: 'clamp(40px, 8vw, 56px)',
              fontWeight: 'bold',
              lineHeight: '1.1',
              marginBottom: '1rem',
              letterSpacing: '-0.02em',
            }}
          >
            {copy.title}
          </h1>
          <p
            className="text-muted"
            style={{
              fontSize: '15px',
              lineHeight: '1.6',
              marginBottom: '2rem',
              maxWidth: '400px',
            }}
          >
            {copy.desc}
          </p>
          <button
            onClick={reset}
            style={{
              height: '40px',
              padding: '0 20px',
              borderRadius: '10px',
              border: '1px solid var(--color-stroke-strong)',
              background: 'var(--color-accent)',
              color: 'var(--color-page)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'opacity 150ms ease-out',
            }}
          >
            {/* 重新加载按钮，触发错误边界 reset */}
            {copy.reload}
          </button>
        </div>
      </body>
    </html>
  );
}
