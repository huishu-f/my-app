/**
 * @file LanguageToggle.tsx
 * @description 语言切换按钮（Navbar）— 中英文互切。
 *              PC 端：zh / en 小写文字（等宽字符 + 固定 w-9，切换后宽度不变，Navbar 无抖动）；
 *              移动端：随当前语言切换的线性图标 — 中文态「文」/ 英文态「A」，
 *              以 lucide 同规格描边画法手绘（20px · strokeWidth 2.5 · 圆头），
 *              图形化标识而非文字，与主题/登录图标视觉重量一致。
 *              切换过渡：内容区先 opacity 淡出（GPU 合成、无布局跳动），
 *              服务端按新语言重渲染完成后淡入，避免整页硬切。
 */
'use client';

import { useEffect, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { LOCALE_COOKIE, type Locale } from '@/i18n/config';

/** 切换过渡安全兜底：refresh 异常挂起时恢复内容可见 */
const RESTORE_TIMEOUT = 1500;

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
  const [isPending, startTransition] = useTransition();

  /** 切换目标语言 */
  const next: Locale = locale === 'zh' ? 'en' : 'zh';

  /** refresh 结束（isPending 转 false）后淡入新语言内容 */
  useEffect(() => {
    if (isPending) return;
    const main = document.getElementById('main-content');
    if (main && main.style.opacity !== '') {
      main.style.opacity = '1';
    }
  }, [isPending]);

  /** 写入偏好 Cookie 并触发整页按新语言重渲染（内容区淡出 → 换语言 → 淡入） */
  const switchLocale = () => {
    if (isPending) return;
    const main = document.getElementById('main-content');
    if (main) {
      // 仅动 opacity：GPU 合成属性，不触发重排，与全局动画规范一致（200ms ease-out 档）
      main.style.transition = 'opacity 200ms ease-out';
      main.style.opacity = '0';
      // 兜底：refresh 未在时限内完成也恢复可见，避免白屏
      window.setTimeout(() => {
        if (main.style.opacity === '0') main.style.opacity = '1';
      }, RESTORE_TIMEOUT);
    }
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    startTransition(() => {
      router.refresh();
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
