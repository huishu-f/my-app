/**
 * @file LanguageToggle.tsx
 * @description 语言切换按钮（Navbar）— 中英文互切。
 *              URL 前缀路由模式：切换语言 = 切换 URL 路径前缀（/zh ↔ /en），
 *              next-intl navigation 的 router.replace(pathname, { locale: next }) 自动处理。
 *              PC 端：zh / en 小写文字（等宽字符 + 固定 w-9，切换后宽度不变，Navbar 无抖动）；
 *              移动端：随当前语言切换的线性图标 — 中文态「文」/ 英文态「A」，
 *              以 lucide 同规格描边画法手绘（20px · strokeWidth 2.5 · 圆头），
 *              图形化标识而非文字，与主题/登录图标视觉重量一致。
 */
'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { type Locale } from '@/i18n/config';

/** 中文态图标 — 「文」的线性描边（点 + 横 + 乂），lucide 视觉规格 */
function WenGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 4.5v1" />
      <path d="M5 9h14" />
      <path d="M6.5 13.5 17.5 20" />
      <path d="M17.5 13.5 6.5 20" />
    </svg>
  );
}

/** 英文态图标 — 「A」的线性描边（两斜 + 横杠），lucide 视觉规格 */
function AGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6.5 19.5 12 4.5l5.5 15" />
      <path d="M8.7 13.5h6.6" />
    </svg>
  );
}

/**
 * LanguageToggle 语言切换按钮
 */
export function LanguageToggle() {
  const locale = useLocale() as Locale;
  const t = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  /** 切换目标语言 */
  const next: Locale = locale === 'zh' ? 'en' : 'zh';

  /** 切换语言：通过 next-intl navigation 切换 URL 路径前缀 */
  const switchLocale = () => {
    if (isPending) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <>
      {/* PC 端：当前语言标识 zh / en（固定宽度，切换语言时无宽度抖动） */}
      <button
        onClick={switchLocale}
        disabled={isPending}
        aria-label={t('languageToggle')}
        className="text-muted [@media(hover:hover)]:hover:bg-surface [@media(hover:hover)]:hover:text-heading disabled:opacity-50 hidden h-9 w-9 items-center justify-center rounded-lg text-(length:--type-sm) font-medium lowercase transition-[background-color,color,opacity] duration-150 ease-out md:flex"
      >
        {locale}
      </button>
      {/* 移动端：随当前语言切换的线性图标 —「文」/「A」，与主题/登录图标同规格（h-9 w-9 · 20px · 2.5 描边） */}
      <button
        onClick={switchLocale}
        disabled={isPending}
        aria-label={t('languageToggle')}
        className="text-muted [@media(hover:hover)]:hover:bg-surface [@media(hover:hover)]:hover:text-heading disabled:opacity-50 flex h-9 w-9 items-center justify-center rounded-lg transition-[background-color,color,opacity] duration-150 ease-out md:hidden"
      >
        {locale === 'zh' ? <WenGlyph /> : <AGlyph />}
      </button>
    </>
  );
}
