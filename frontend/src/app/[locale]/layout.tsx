/**
 * @file layout.tsx
 * @description /{locale} 段的布局，也是实际输出 <html>/<body> 的文档根：校验 locale 合法性、装配 next-intl / next-themes / 鉴权 Provider 与导航、页脚和路由过渡，并集中声明全站 Metadata 与 Viewport
 */
import { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, getLocale } from 'next-intl/server';

import '@/app/globals.css';
import { Navbar } from '@/ui/layout/Navbar';
import { Footer } from '@/ui/layout/Footer';
import { AppProviders } from '@/providers/AppProviders';
import { RouteTransition } from '@/ui/layout/RouteTransition';
import { htmlLang, ogLocale, type Locale } from '@/config/i18n';
import { routing } from '@/i18n/routing';
import { resolveLocaleParams } from '@/i18n/locale-params';

/** LocaleLayout 布局组件入参，由 Next 运行时注入 */
type Props = {
  /** /{locale} 下任意子路由（含嵌套布局、页面）的渲染结果 */
  children: React.ReactNode;

  /** 动态段参数，新版 App Router 约定为 Promise，须 await 后取 locale（来自路径首段 /zh、/en） */
  params: Promise<{ locale: string }>;
};

/**
 * 声明需要静态预渲染的 locale 参数集合，使 /{locale} 下的页面走 SSG
 * @returns 形如 [{ locale: 'zh' }, { locale: 'en' }] 的参数列表，来源为 routing.locales
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * 生成全站默认元数据（子页面可覆盖），文案取自 i18n 的 meta 命名空间并按当前请求语言解析
 * @param props params.locale 决定元数据语言；必须先于任何 next-intl API 固定
 * @returns Metadata：title/description + openGraph（含 og:locale 与分享图）+ twitter 卡片 + robots 索引许可
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  // 这一步不能省。未固定请求语言时，下面的 getTranslations/getLocale 会退回读 headers() 做语言协商，
  // 而 headers() 在「静态页的运行期按需渲染」上下文中会被 Next 判定为
  // 「Page changed from static to dynamic, reason: headers」并整页 500——
  // 未预渲染的文章 id（如 /zh/posts/不存在的-id）正是走这条路径，于是本该 404 的请求变成 500。
  // 布局组件体内虽已固定过一次，但元数据生成可能先于组件渲染执行，因此这里必须独立再调一次。
  await resolveLocaleParams(params);

  const t = await getTranslations('meta');
  const locale = (await getLocale()) as Locale;

  return {
    title: t('siteTitle'),
    description: t('siteDescription'),
    /** 相对 URL 的解析基准；缺环境变量时回退本地开发地址，保证分享链接始终是绝对地址 */
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
    /**
     * hreflang：声明 zh/en 互为翻译页（子页面未覆写时继承首页语义），x-default 指向默认语言。
     * 仅设首页根地址，文章详情等子页在各自 generateMetadata 覆写为带路径的精确地址
     */
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
        'x-default': `/${routing.defaultLocale}`,
      },
    },
    openGraph: {
      title: t('siteTitle'),
      description: t('siteDescription'),
      type: 'website',
      locale: ogLocale(locale),
      siteName: t('siteTitle'),
      images: [
        {
          // 1200×630 为 OG 分享图的常用推荐尺寸，比例 1.91:1 适配多数平台裁切
          url: '/og-default.png',
          width: 1200,
          height: 630,
          alt: t('ogImageAlt'),
        },
      ],
    },
    /** Twitter 卡片：card 决定大图样式，images 单独复用同一张默认分享图路径 */
    twitter: {
      card: 'summary_large_image',
      title: t('siteTitle'),
      description: t('siteDescription'),
      images: ['/og-default.png'],
    },
    /** 允许索引且允许跟踪页内链接（与 robots.ts 的 disallow 规则配合生效） */
    robots: {
      index: true,
      follow: true,
    },
  };
}

/** 视口配置：宽度跟随设备、初始缩放 1；未设 maximumScale，即不禁止用户手动缩放 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/**
 * /{locale} 布局：输出文档根节点并装配 Provider 与站内骨架
 * @param props {@link Props}
 * @throws locale 不在 routing.locales 白名单内时调用 notFound()；因抛出点在布局自身，改由上层（根级）404 边界渲染
 */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await resolveLocaleParams(params);

  // 服务端一次性读出当前语言的全部文案，再注入客户端 Provider 供 useTranslations 等同步取值
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
        {/* <html> 上的 suppressHydrationWarning：next-themes 在客户端给根节点挂 dark/light class，服务端首帧必然与之不一致 */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppProviders>
            {/* 键盘用户的"跳到主内容"链接：平时 sr-only 视觉隐藏，仅聚焦时靠 focus:not-sr-only 显形并固定到左上角；
                层级取 --z-skip，保证盖过弹窗与提示 */}
            <a
              href="#main-content"
              className="focus:bg-accent focus:text-page sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-(--z-skip) focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
            >
              {t('skipToContent')}
            </a>
            <Navbar />
            {/* 主内容区：id 供上面的跳过链接定位；min-height 减去导航高度 --nav-h（与 Navbar 同源，改导航高度只需动令牌），
                让首屏正文恰好填满剩余视口，pb-12 为页脚前留出间距 */}
            <main id="main-content" className="min-h-[calc(100vh-var(--nav-h))] pb-12">
              <RouteTransition>{children}</RouteTransition>
            </main>
            <Footer />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
