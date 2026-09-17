/**
 * @file PinnedBadge.tsx
 * @description 置顶标记徽章：图钉图标 + 本地化"置顶"文案，作为文章卡片 badge 插槽的现成内容；无入参，文案取自 common.pinned，不可自定义
 */
import { Pin } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * PinnedBadge 置顶标记
 * @example
 * badge={post.pinned ? <PinnedBadge /> : undefined}
 */
export function PinnedBadge() {
  const t = useTranslations('common');
  return (
    <span className="chip-sm">
      <Pin size={10} strokeWidth={2.5} />
      {t('pinned')}
    </span>
  );
}
