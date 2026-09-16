/**
 * @file layout.tsx — 应用布局（locale 段）
 * @description 注册全局字体、Provider 链（next-intl 多语言 / next-themes 主题）与多语言元数据。
 *              setRequestLocale(locale) 将 locale 写入请求级存储，使 next-intl API 不依赖 cookies()/headers()，
 *              页面可静态渲染/ISR。generateStaticParams 为每个 locale 预生成路由。
 */
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale, getMessages, getTranslations, getLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import '@/app/globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Providers } from '@/components/providers';
import { RouteTransition } from '@/components/layout/RouteTransition';
import { htmlLang, ogLocale, type Locale } from '@/i18n/config';
import { routing } from '@/i18n/routing';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/** 为所有 locale 预生成静态路由 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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
 * LocaleLayout 布局，注入语言 Provider、主题初始化脚本、Provider 链与客户端布局壳
 * @param props 含 children（路由页面元素）与 params（含 locale 路由参数）
 */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations('nav');

  return (
    <html
      lang={htmlLang(locale as Locale)}
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
