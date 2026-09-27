import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale, getMessages, getTranslations, getLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import "@/app/globals.css";
import { Navbar } from "@/components/layouts/Navbar";
import { Footer } from "@/components/layouts/Footer";
import { Providers } from "@/components/Providers";
import { RouteTransition } from "@/components/layouts/RouteTransition";
import { htmlLang, ogLocale, type Locale } from "@/i18n/config";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/config/site";

type Props = {
  children: React.ReactNode;

  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  if (!hasLocale(routing.locales, rawLocale)) notFound();
  setRequestLocale(rawLocale);

  const t = await getTranslations("meta");
  const locale = (await getLocale()) as Locale;

  return {
    title: t("siteTitle"),
    description: t("siteDescription"),

    metadataBase: new URL(SITE_URL),

    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
        "x-default": `/${routing.defaultLocale}`,
      },
    },
    openGraph: {
      title: t("siteTitle"),
      description: t("siteDescription"),
      type: "website",
      locale: ogLocale(locale),
      siteName: t("siteTitle"),
      images: [
        {
          url: "/og-default.png",
          width: 1200,
          height: 630,
          alt: t("ogImageAlt"),
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: t("siteTitle"),
      description: t("siteDescription"),
      images: ["/og-default.png"],
    },

    robots: {
      index: true,
      follow: true,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations("nav");

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
              className="focus:bg-accent focus:text-page sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-(--z-skip) focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
            >
              {t("skipToContent")}
            </a>
            <Navbar />

            <main id="main-content" className="min-h-[calc(100vh-var(--nav-h))] pb-12">
              <RouteTransition>{children}</RouteTransition>
            </main>
            <Footer />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
