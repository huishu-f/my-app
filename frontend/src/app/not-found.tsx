/**
 * @file not-found.tsx
 * @description 根级 404 页面：locale 前缀之外的路径（如非法语言前缀、兜底路由之外的未匹配地址）命中 404 时由
 * Next 渲染；自带 <html>/<body>，离线设计令牌复用 error-page-shell，不依赖 [locale] 布局、Tailwind 与 next-intl Provider
 */
// 必须为客户端组件：语言判定读取 window.location，服务端阶段拿不到最终请求路径
'use client';

import {
  ERROR_PAGE_CSS,
  errorShellStyle,
  errorTitleStyle,
  errorDescStyle,
} from '@/lib/error-page-shell';

/** 页面文案字典：本页在 [locale] 布局之外、无 NextIntlClientProvider，故不走 i18n 而直接内置双语 */
const copy = {
  /** 中文文案 */
  zh: {
    title: '404',
    desc: '你访问的页面不存在或已被移动。',
    goHome: '返回首页',
    browsePosts: '浏览文章',
  },
  /** 英文文案 */
  en: {
    title: '404',
    desc: 'The page you are looking for does not exist or has been moved.',
    goHome: 'Go home',
    browsePosts: 'Browse posts',
  },
} as const;

/** 两个跳转链接共用的基础按钮样式：主链接为实底，次级链接叠描边 */
const linkBaseStyle = {
  height: '40px',
  padding: '0 20px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '500',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
} as const;

/**
 * 根级 404 渲染入口（无 props）
 * 由 Next 在未被 [locale]/not-found.tsx 接管的路径上调用，因脱离布局需自行输出 <html> 与 <body>
 */
export default function RootNotFound() {
  /**
   * 语言判定：读不到 i18n 上下文，只能用地址栏是否以 /en 开头选择文案
   * 服务端与客户端首帧 window 不存在时固定按中文渲染
   */
  const lang =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/en') ? 'en' : 'zh';
  const t = copy[lang];

  return (
    <html lang={lang === 'en' ? 'en' : 'zh-CN'}>
      <body className="antialiased">
        {/* 离线设计令牌：本页不引 globals.css、不挂 next-themes，配色与排版全靠共享的 error-page-shell 内联样式 */}
        <style>{ERROR_PAGE_CSS}</style>
        {/* className 中的 Tailwind 工具类在本页未被加载，仅作语义标记；实际布局由 style 保证 */}
        <div
          className="flex min-h-screen flex-col items-center justify-center text-center"
          style={errorShellStyle}
        >
          <h1 style={errorTitleStyle}>{t.title}</h1>
          <p style={errorDescStyle}>{t.desc}</p>
          {/* 无 next-intl Link 可用，跳转地址按当前 lang 手写 locale 前缀拼出 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
            <a
              href={lang === 'en' ? '/en' : '/zh'}
              style={{
                ...linkBaseStyle,
                background: 'var(--color-accent)',
                color: 'var(--color-page)',
              }}
            >
              {t.goHome}
            </a>
            <a
              href={lang === 'en' ? '/en/posts' : '/zh/posts'}
              style={{
                ...linkBaseStyle,
                border: '1px solid var(--color-stroke-strong)',
                color: 'var(--color-body)',
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
