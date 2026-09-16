/**
 * @file BackLink.tsx
 * @description 智能返回链接 — 有站内软导航历史时 router.back() 回来源页，
 *              否则（直接从 URL/分享链接进入）回退到 /posts。
 *              使用 button 元素避免 hydration mismatch，click 时判断历史。
 */
'use client';

import { useRouter } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { hasInAppHistory } from '@/lib/navigation';

/**
 * BackLink 智能返回链接，有站内浏览历史时返回上一页，否则回退到文章列表
 */
export function BackLink() {
  const router = useRouter();
  const t = useTranslations('common');

  /**
   * 返回按钮点击处理：站内软导航过则 back()，否则跳文章列表。
   * 判据见 hasInAppHistory（history.length 在手机 webview 下恒 >1，back 会退出站点）
   */
  const handleBack = () => {
    if (hasInAppHistory()) {
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
