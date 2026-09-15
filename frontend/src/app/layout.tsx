/**
 * @file layout.tsx
 * @description 应用根布局，注册全局字体、Provider 链（next-intl 多语言 / next-themes 主题）与多语言元数据
 */
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Providers } from '@/components/providers';
import { RouteTransition } from '@/components/layout/RouteTransition';
import { htmlLang, ogLocale, type Locale } from '@/i18n/config';

/**
 * 应用元数据配置（随语言切换）
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  const locale = (await getLocale()) as Locale;

  return {
    title: t('siteTitle'),
    description: t('siteDescription'),
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
    openGraph: {
      title: t('siteTitle'),
      description: t('siteDescription'),
      type: 'website',
      locale: ogLocale(locale),
      siteName: t('siteTitle'),
      images: [
        {
          url: '/og-default.png',
          width: 1200,
          height: 630,
          alt: t('ogImageAlt'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('siteTitle'),
      description: t('siteDescription'),
      images: ['/og-default.png'],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

/** 视口配置 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/**
 * RootLayout 根布局，注入语言 Provider、主题初始化脚本、Provider 链与客户端布局壳
 * @param props 含 children（路由页面元素）
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const t = await getTranslations('nav');

  return (
    <html
      lang={htmlLang(locale)}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className="font-sans"
    >
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <a
              href="#main-content"
              className="focus:bg-accent focus:text-page sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
            >
              {t('skipToContent')}
            </a>
            <Navbar />
            <main id="main-content" className="min-h-[calc(100vh-64px)] pb-12">
              <RouteTransition>{children}</RouteTransition>
            </main>
            <Footer />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
