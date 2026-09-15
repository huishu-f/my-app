/**
 * @file PinnedBadge.tsx
 * @description 置顶徽章组件，用于文章卡片展示置顶标记
 */
import { Pin } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** PinnedBadge 置顶徽章 */
export function PinnedBadge() {
  const t = useTranslations('common');
  return (
    <span className="chip-sm">
      <Pin size={10} strokeWidth={2.5} />
      {t('pinned')}
    </span>
  );
}
