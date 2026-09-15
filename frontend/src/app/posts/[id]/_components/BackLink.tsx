/**
 * @file BackLink.tsx
 * @description 智能返回链接 — 优先 router.back() 回到来源页，
 *              无浏览历史时（如直接从 URL 进入）回退到 /posts。
 *              使用 button 元素避免 hydration mismatch，click 时判断历史。
 */
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * BackLink 智能返回链接，有浏览历史时返回上一页，无历史时回退到文章列表
 */
export function BackLink() {
  const router = useRouter();
  const t = useTranslations('common');

  /**
   * 返回按钮点击处理：有浏览历史则返回上一页，否则跳转文章列表
   */
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/posts');
    }
  };

  return (
    <button
      onClick={handleBack}
      className="text-muted hover:text-heading mb-8 inline-flex items-center gap-2 text-(length:--type-sm) font-medium transition-colors duration-150 cursor-pointer"
    >
      <ArrowLeft size={15} strokeWidth={2.5} />
      {t('back')}
    </button>
  );
}
