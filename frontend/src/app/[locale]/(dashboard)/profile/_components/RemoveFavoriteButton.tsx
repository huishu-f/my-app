/**
 * @file RemoveFavoriteButton.tsx
 * @description 收藏列表「取消收藏」按钮：调用收藏 toggle 接口，成功后 toast 并回调父级移除该项，pending 期间按钮呈 loading
 */
'use client';

import { BookmarkX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from '@/lib/toast';
import { Button } from '@/components/ui/Button';
import { useToggleFavorite } from '@/services/blog/hooks';
import type { PostIdProps } from '@my-app/shared';

/**
 * RemoveFavoriteButton 组件入参（postId 继承自 shared 的 {@link PostIdProps}，已注释不重复）
 */
interface RemoveFavoriteButtonProps extends PostIdProps {
  /** 取消收藏成功后的回调，父组件据此把该文章从收藏列表移除 */
  onRemoved?: () => void;
}

/**
 * 取消收藏按钮
 * @param props {@link RemoveFavoriteButtonProps}
 * 收藏接口是 toggle 语义：本按钮只出现在「已收藏」列表中，因此调一次即为取消收藏
 */
export function RemoveFavoriteButton({ postId, onRemoved }: RemoveFavoriteButtonProps) {
  const t = useTranslations('profile');

  /** 收藏 toggle 变更请求，isPending 用作按钮 loading 态 */
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
