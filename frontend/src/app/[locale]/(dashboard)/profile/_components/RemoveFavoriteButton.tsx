/**
 * @file RemoveFavoriteButton.tsx
 * @description 取消收藏按钮，调用 toggleFavorite 接口移除收藏并提示结果
 */
'use client';

import { BookmarkX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from '@/lib/toast';
import { Button } from '@/components/ui/Button';
import { useToggleFavorite } from '@/services/blog/hooks';
import type { PostIdProps } from '@my-app/shared';

/**
 * RemoveFavoriteButton 组件入参，在 PostIdProps 基础上扩展移除成功回调
 */
interface RemoveFavoriteButtonProps extends PostIdProps {
  /** 取消收藏成功后的回调（供父级列表即时移除该卡片，避免 UI 停留旧状态） */
  onRemoved?: () => void;
}

/**
 * RemoveFavoriteButton 取消收藏按钮
 * @param props {@link RemoveFavoriteButtonProps}
 */
export function RemoveFavoriteButton({ postId, onRemoved }: RemoveFavoriteButtonProps) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  /** 取消收藏的 mutation 实例 */
  const toggleFavoriteMutation = useToggleFavorite();

  return (
    <Button
      variant="ghost"
      size="sm"
      loading={toggleFavoriteMutation.isPending}
      onClick={() =>
        toggleFavoriteMutation.mutate(postId, {
          onSuccess: () => {
            toast.success(t('removeFavoriteSuccess'));
            onRemoved?.();
          },
          onError: () => toast.error(t('removeFavoriteFailed')),
        })
      }
    >
      <BookmarkX size={14} strokeWidth={2.5} />
      {t('removeFavorite')}
    </Button>
  );
}
