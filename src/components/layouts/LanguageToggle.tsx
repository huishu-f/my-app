"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { type Locale } from "@/i18n/config";

export const LOCALE_LABELS: Record<Locale, string> = { zh: "中文", en: "English" };

const GLYPH_PROPS = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.25,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-4.5 w-4.5",
  "aria-hidden": true,
} as const;

function WenGlyph() {
  return (
    <svg {...GLYPH_PROPS}>
      <path d="M12 4.5v1" />
      <path d="M5 9h14" />
      <path d="M6.5 13.5 17.5 20" />
      <path d="M17.5 13.5 6.5 20" />
    </svg>
  );
}

function AGlyph() {
  return (
    <svg {...GLYPH_PROPS}>
      <path d="M6.5 19.5 12 4.5l5.5 15" />
      <path d="M8.7 13.5h6.6" />
    </svg>
  );
}

export function LocaleGlyph({ locale }: { locale: Locale }) {
  return locale === "zh" ? <WenGlyph /> : <AGlyph />;
}

export function useLocaleSwitch() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const [isPending, startTransition] = useTransition();

  const next: Locale = locale === "zh" ? "en" : "zh";

  const switchTo = (target: Locale) => {
    if (isPending || target === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: target });
    });
  };

  return { locale, next, isPending, switchTo };
}

export function LanguageToggle() {
  const t = useTranslations("nav");
  const { locale, next, isPending, switchTo } = useLocaleSwitch();

  return (
    <button
      onClick={() => switchTo(next)}
      disabled={isPending}
      aria-label={t("languageToggle")}
      className="icon-btn-ghost text-(length:--type-xs) leading-normal font-medium lowercase disabled:opacity-50"
    >
      {locale}
    </button>
  );
}
