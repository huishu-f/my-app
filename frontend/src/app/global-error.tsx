/**
 * @file global-error.tsx
 * @description 应用级全局错误边界：兜住根布局自身抛出的致命错误（整棵路由树被卸载时渲染），因此必须自行输出
 * <html>/<body>；离线设计令牌复用 error-page-shell，只暴露"重新加载"重试入口，不向用户展示错误堆栈
 */
'use client';

import { useEffect } from 'react';
import {
  ERROR_PAGE_CSS,
  errorShellStyle,
  errorTitleStyle,
  errorDescStyle,
} from './error-page-shell';

/** 本页独有的按钮交互反馈样式（其余令牌与壳样式见 error-page-shell） */
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

/**
 * 全局错误兜底页（无 Props 类型，签名为 Next 约定的 error / reset）
 * @param props.error 捕获到的错误；生产构建下服务端错误可能只剩 digest 摘要
 * @param props.reset 重置错误边界的回调，触发后 React 重新渲染整棵应用树
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // 把致命错误写进浏览器控制台供排查；页面本身不渲染堆栈，避免向用户暴露内部信息
  useEffect(() => {
    console.error(error);
  }, [error]);

  /**
   * 语言判定：该边界在 [locale] 布局与 NextIntlClientProvider 之外，取不到 locale 上下文
   * 只能靠地址栏是否以 /en 开头选择文案；window 不存在（服务端渲染）时按中文
   */
  const isEn = typeof window !== 'undefined' && window.location.pathname.startsWith('/en');

  /** 内置双语文案，按标题 / 说明 / 按钮三处展示位取用 */
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
        {/* 离线设计令牌：本页不引 globals.css，配色与字体全靠共享的 error-page-shell 内联样式 */}
        <style>{ERROR_PAGE_CSS + RELOAD_CSS}</style>
        {/* className 中的 Tailwind 工具类在本页未被加载，实际布局由 style 保证 */}
        <div
          className="flex min-h-screen flex-col items-center justify-center text-center"
          style={errorShellStyle}
        >
          <h1 style={errorTitleStyle}>{copy.title}</h1>
          <p style={errorDescStyle}>{copy.desc}</p>
          {/* 文案写"重新加载"，实际调用 Next 注入的 reset：只让 React 重新渲染已卸载的树，不会刷新浏览器页面 */}
          <button
            onClick={reset}
            className="ge-reload"
            style={{
              height: '40px',
              padding: '0 20px',
              borderRadius: '8px',
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
            {copy.reload}
          </button>
        </div>
      </body>
    </html>
  );
}
