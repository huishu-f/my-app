/**
 * @file not-found.tsx — 根级 404 边界
 * @description 捕获不匹配 [locale] 段的路径（如 /unknown-route）。
 *              此时 [locale]/not-found.tsx 无法触发（不在 locale 段内），
 *              需要根级 not-found 自带 html/body 壳，轻量双语检测 locale。
 *              'use client' — 需在客户端读 window.location.pathname 检测语言。
 */
'use client';

const copy = {
  zh: {
    title: '404',
    desc: '你访问的页面不存在或已被移动。',
    goHome: '返回首页',
    browsePosts: '浏览文章',
  },
  en: {
    title: '404',
    desc: 'The page you are looking for does not exist or has been moved.',
    goHome: 'Go home',
    browsePosts: 'Browse posts',
  },
};

export default function RootNotFound() {
  const lang =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/en')
      ? 'en'
      : 'zh';
  const t = copy[lang];

  return (
    <html lang={lang === 'en' ? 'en' : 'zh-CN'}>
      <body className="antialiased">
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
