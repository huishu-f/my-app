/**
 * @file not-found.tsx
 * @description 根级 404 页面：兜底捕获不匹配 [locale] 段的路径（如 /unknown-route）。
 *              此时不在 locale 段内，[locale]/not-found.tsx 不会触发，
 *              本页自带 html/body 壳与内联样式，并按 URL 前缀做轻量双语。
 *              'use client'：需在客户端读取 window.location.pathname 判定语言。
 */
'use client';

/**
 * 双语文案常量集合
 */
const copy = {
  /** 简体中文文案 */
  zh: {
    /** 页面大标题 */
    title: '404',
    /** 描述文案 */
    desc: '你访问的页面不存在或已被移动。',
    /** 返回首页按钮文案 */
    goHome: '返回首页',
    /** 浏览文章按钮文案 */
    browsePosts: '浏览文章',
  },
  /** 英文文案 */
  en: {
    /** 页面大标题 */
    title: '404',
    /** 描述文案 */
    desc: 'The page you are looking for does not exist or has been moved.',
    /** 返回首页按钮文案 */
    goHome: 'Go home',
    /** 浏览文章按钮文案 */
    browsePosts: 'Browse posts',
  },
};

/**
 * RootNotFound 根级 404 页面组件
 * 按路径前缀选择中/英文案，渲染标题、描述与两个导航入口
 */
export default function RootNotFound() {
  /** 语言判定：路径以 /en 开头则英文，否则默认中文 */
  const lang =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/en')
      ? 'en'
      : 'zh';
  /** 当前语言的文案对象 */
  const t = copy[lang];

  return (
    <html lang={lang === 'en' ? 'en' : 'zh-CN'}>
      <body className="antialiased">
        {/* 内联定义明/暗两套 CSS 变量，脱离 globals.css 独立成活 */}
        <style>{`
          :root {
            --color-page: #ffffff;
            --color-body: #52525b;
            --color-muted: #71717a;
            --color-heading: #1f1f23;
            --color-accent: #09090b;
            --color-stroke-strong: #b8bdc7;
            --font-sans: ui-sans-serif, system-ui, -apple-system, 'Noto Sans SC', sans-serif;
          }
          .dark {
            --color-page: #0a0a0b;
            --color-body: #a1a1aa;
            --color-muted: #71717a;
            --color-heading: #ececef;
            --color-accent: #fafafa;
            --color-stroke-strong: #2e2e36;
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
            {/* 404 大标题 */}
            {t.title}
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
            {t.desc}
          </p>
          {/* 导航入口按钮组：返回首页 / 浏览文章 */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <a
              href={lang === 'en' ? '/en' : '/zh'}
              style={{
                height: '40px',
                padding: '0 20px',
                borderRadius: '10px',
                background: 'var(--color-accent)',
                color: 'var(--color-page)',
                fontSize: '14px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              {t.goHome}
            </a>
            <a
              href={lang === 'en' ? '/en/posts' : '/zh/posts'}
              style={{
                height: '40px',
                padding: '0 20px',
                borderRadius: '10px',
                border: '1px solid var(--color-stroke-strong)',
                color: 'var(--color-body)',
                fontSize: '14px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
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
