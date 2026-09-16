/**
 * @file layout.tsx
 * @description locale 段应用布局：注入 <html>/<body> 结构、next-intl 多语言 Provider 链、
 *              全局导航/页脚与路由切换过渡动画。setRequestLocale 将 locale 写入请求级存储，
 *              使 next-intl API 不依赖 cookies()/headers()，子页面可静态渲染/ISR；
 *              generateStaticParams 为每个 locale 预生成路由参数。
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

/**
 * 布局组件入参
 */
type Props = {
  /** 子路由页面内容 */
  children: React.ReactNode;
  /** 路由动态参数，含当前 locale 值 */
  params: Promise<{ locale: string }>;
};

/**
 * 为所有 locale 预生成静态路由参数
 * @returns locale 参数集合
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 生成应用级元数据（标题/描述/OpenGraph/Twitter/robots），文案随当前语言切换
 * @returns Next.js Metadata 对象
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

/** 视口配置：设备宽度适配 + 初始缩放 1 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/**
 * LocaleLayout 布局组件
 * 校验 locale 合法性、注入 next-intl Provider 与全局 Provider 链，渲染导航/主区/页脚壳
 * @param props.children 子路由页面元素
 * @param props.params 含 locale 路由参数
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
        {/* 多语言消息 Provider，包裹整棵应用树 */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            {/* 无障碍跳转链接：键盘聚焦时可见，直达主内容区 */}
            <a
              href="#main-content"
              className="focus:bg-accent focus:text-page sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
            >
              {t('skipToContent')}
            </a>
            {/* 全局导航栏 */}
            <Navbar />
            {/* 主内容区：路由切换过渡动画包裹子页面 */}
            <main id="main-content" className="min-h-[calc(100vh-64px)] pb-12">
              <RouteTransition>{children}</RouteTransition>
            </main>
            {/* 全局页脚 */}
            <Footer />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
