/**
 * @file BackLink.tsx
 * @description 详情页"返回列表"按钮：优先走浏览器 history.back 回到上一页，无站内历史时兜底跳转 /posts
 */
'use client';

import { useRouter } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { hasInAppHistory } from '@/lib/navigation';

/**
 * BackLink 返回按钮（无入参）
 */
export function BackLink() {
  const router = useRouter();

  const t = useTranslations('common');

  /**
   * 返回处理：存在站内历史时 history.back 保留滚动与来源上下文；
   * 直接打开详情页无历史时兜底跳转文章列表
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
      className="text-muted hover:text-heading mb-8 inline-flex cursor-pointer items-center gap-2 text-(length:--type-xs) font-medium transition-colors duration-150"
    >
      <ArrowLeft size={14} strokeWidth={2.5} />
      {t('back')}
    </button>
  );
}
