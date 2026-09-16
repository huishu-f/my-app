/**
 * @file BackLink.tsx
 * @description 智能返回链接：有站内软导航历史时 router.back() 回来源页，
 *              否则（直接从 URL/分享链接进入）跳转 /posts。
 *              使用 button 元素在点击时才判断历史，避免 SSR/CSR 判定不一致导致 hydration mismatch。
 */
'use client';

import { useRouter } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { hasInAppHistory } from '@/lib/navigation';

/**
 * BackLink 智能返回链接组件
 */
export function BackLink() {
  /** 国际化路由实例 */
  const router = useRouter();
  /** 通用文案翻译函数 */
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
    /* 返回按钮：左箭头 + 文案 */
    <button
      onClick={handleBack}
      className="text-muted hover:text-heading mb-8 inline-flex items-center gap-2 text-(length:--type-sm) font-medium transition-colors duration-150 cursor-pointer"
    >
      <ArrowLeft size={15} strokeWidth={2.5} />
      {t('back')}
    </button>
  );
}
