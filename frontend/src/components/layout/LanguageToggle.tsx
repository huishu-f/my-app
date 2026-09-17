/**
 * @file LanguageToggle.tsx
 * @description 语言切换入口：useLocaleSwitch 提供「当前语言 / 目标语言 / 切换中 / 切到指定语言」，
 *   桌面端渲染当前语言码按钮，移动端抽屉的语言行复用同一 Hook 与 LocaleGlyph 字形
 */
'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { type Locale } from '@/i18n/config';

/** 语言自名：每种语言用自己的文字书写（不随界面语言翻译），供按钮与抽屉语言行共用 */
export const LOCALE_LABELS: Record<Locale, string> = { zh: '中文', en: 'English' };

/** 导航条图标统一尺寸与线宽：18px（h-4.5）+ 2.25 线宽，在一排 36px 方形按钮里重量一致 */
const GLYPH_PROPS = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.25,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'h-4.5 w-4.5',
  'aria-hidden': true,
} as const;

/**
 * 中文「文」字图标：当前语言为 zh 时展示
 */
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

/**
 * 拉丁字母「A」图标：当前语言为 en 时展示
 */
function AGlyph() {
  return (
    <svg {...GLYPH_PROPS}>
      <path d="M6.5 19.5 12 4.5l5.5 15" />
      <path d="M8.7 13.5h6.6" />
    </svg>
  );
}

/**
 * 当前语言对应的字形图标
 * @param locale 当前语言
 * @description 语言是「字形」而非通用符号，故不用通用地球图标，直接用该语言自身的字符做识别
 */
export function LocaleGlyph({ locale }: { locale: Locale }) {
  return locale === 'zh' ? <WenGlyph /> : <AGlyph />;
}

/**
 * 读取语言状态与切换入口
 * @returns locale 当前语言；next 另一种语言；isPending 是否切换中；switchTo 切到指定语言
 * @description 桌面按钮与抽屉语言行共用，避免两处各写一份过渡态与路由替换逻辑
 */
export function useLocaleSwitch() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  /** isPending：切换进行中；startTransition：将路由替换标记为过渡更新 */
  const [isPending, startTransition] = useTransition();

  /** 目标语言：取当前语言之外的另一种（zh <-> en） */
  const next: Locale = locale === 'zh' ? 'en' : 'zh';

  /**
   * 切换语言：过渡未结束或已是目标语言时直接跳过，避免重复触发；
   * 用 startTransition 包裹 replace，仅更换 locale 保持当前 pathname 不变
   */
  const switchTo = (target: Locale) => {
    if (isPending || target === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: target });
    });
  };

  return { locale, next, isPending, switchTo };
}

/**
 * 语言切换按钮（桌面端）：以当前语言码作为按钮文案，点击切到另一种语言
 */
export function LanguageToggle() {
  const t = useTranslations('nav');
  const { locale, next, isPending, switchTo } = useLocaleSwitch();

  return (
    <button
      onClick={() => switchTo(next)}
      disabled={isPending}
      aria-label={t('languageToggle')}
      className="icon-btn-ghost text-(length:--type-xs) leading-normal font-medium lowercase disabled:opacity-50"
    >
      {locale}
    </button>
  );
}
