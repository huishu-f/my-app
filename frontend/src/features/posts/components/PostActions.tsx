/**
 * @file PostActions.tsx
 * @description 详情页操作区（点赞/收藏/评论数）：登录校验后以 useOptimistic 乐观更新计数与选中态，请求返回真实数据后回写文章状态
 */
'use client';

import { useOptimistic, useTransition } from 'react';
import { Heart, Bookmark, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from '@/lib/toast';
import { useToggleLike, useToggleFavorite } from '@/services/blog/hooks';
import { usePostPageAuth } from '@/hooks/usePostPageAuth';
import { usePostState } from '@/features/posts/components/PostStateProvider';
import { formatCount } from '@/lib/format';
import { Button } from '@/ui/Button';
import type { PostActionsProps } from '@my-app/shared';

/**
 * 点赞/收藏的乐观状态快照（先本地更新展示，服务端返回后校正）
 */
interface OptimisticState {
  /** 当前点赞总数 */
  likes: number;

  /** 当前收藏总数 */
  favorites: number;

  /** 当前用户是否已点赞 */
  liked: boolean;

  /** 当前用户是否已收藏 */
  favorited: boolean;
}

/**
 * PostActions 点赞/收藏操作区
 * @param props {@link PostActionsProps}
 */
export function PostActions({ user: ssrUser }: PostActionsProps) {
  const t = useTranslations('post');

  const likeMutation = useToggleLike();

  const favoriteMutation = useToggleFavorite();

  const { post } = usePostState();

  const { user, updatePost, requireAuth } = usePostPageAuth(post.id, ssrUser);

  /** 当前用户是否已点赞本文 */
  const liked = !!user?.likedArticles?.includes(post.id);

  /** 当前用户是否已收藏本文 */
  const favorited = !!user?.favoritedArticles?.includes(post.id);

  /** 未登录时降低整块交互区的不透明度 */
  const guestCls = !user ? 'opacity-60' : '';

  /** 乐观更新快照：初始值取自当前文章与用户点赞/收藏标记，交互时先本地变更再由请求校正 */
  const [optimisticState, addOptimistic] = useOptimistic<
    Omit<OptimisticState, never>,
    Partial<OptimisticState>
  >({ likes: post.likes, favorites: post.favorites ?? 0, liked, favorited }, (current, update) => ({
    ...current,
    ...update,
  }));

  /** 点赞请求进行中标记 */
  const [isLikePending, startLikeTransition] = useTransition();

  /** 收藏请求进行中标记 */
  const [isFavPending, startFavTransition] = useTransition();

  /**
   * 切换点赞：登录校验通过后先乐观取反并加减计数，请求返回真实 likes/liked 后回写文章状态并弹提示
   */
  const toggleLike = () => {
    requireAuth(() => {
      startLikeTransition(async () => {
        const newLiked = !optimisticState.liked;
        addOptimistic({
          liked: newLiked,
          likes: newLiked ? optimisticState.likes + 1 : Math.max(0, optimisticState.likes - 1),
        });
        const data = await likeMutation.mutate(post.id);
        if (data) {
          updatePost((prev) => ({ ...prev, likes: data.likes }));
          toast.success(data.liked ? t('likeSuccess') : t('unlikeSuccess'));
        }
      });
    });
  };

  /**
   * 切换收藏：逻辑同点赞，乐观更新收藏态与计数，请求返回真实 favorites/favorited 后回写并提示
   */
  const toggleFavorite = () => {
    requireAuth(() => {
      startFavTransition(async () => {
        const newFavorited = !optimisticState.favorited;
        addOptimistic({
          favorited: newFavorited,
          favorites: newFavorited
            ? optimisticState.favorites + 1
            : Math.max(0, optimisticState.favorites - 1),
        });
        const data = await favoriteMutation.mutate(post.id);
        if (data) {
          updatePost((prev) => ({ ...prev, favorites: data.favorites }));
          toast.success(data.favorited ? t('favoriteSuccess') : t('unfavoriteSuccess'));
        }
      });
    });
  };

  return (
    <div className="row-lg border-stroke mt-8 flex-wrap border-t border-b py-8">
      <Button
        variant={optimisticState.liked ? 'primary' : 'outline'}
        size="md"
        onClick={toggleLike}
        loading={isLikePending}
        disabled={isLikePending || isFavPending}
        aria-pressed={optimisticState.liked}
        title={!user ? t('loginToLike') : undefined}
        className={`rounded-full ${guestCls}`}
      >
        <Heart
          size={16}
          strokeWidth={2.5}
          className={optimisticState.liked ? 'fill-current' : ''}
          aria-hidden="true"
        />
        {optimisticState.liked ? t('liked') : t('like')} · {formatCount(optimisticState.likes)}
      </Button>

      <Button
        variant={optimisticState.favorited ? 'primary' : 'outline'}
        size="md"
        onClick={toggleFavorite}
        loading={isFavPending}
        disabled={isLikePending || isFavPending}
        aria-pressed={optimisticState.favorited}
        title={!user ? t('loginToFavorite') : undefined}
        className={`rounded-full ${guestCls}`}
      >
        <Bookmark
          size={16}
          strokeWidth={2.5}
          className={optimisticState.favorited ? 'fill-current' : ''}
          aria-hidden="true"
        />
        {optimisticState.favorited ? t('favorited') : t('favorite')} ·{' '}
        {formatCount(optimisticState.favorites)}
      </Button>

      <span className="text-muted inline-flex items-center gap-1.5 text-(length:--type-xs)">
        <MessageCircle size={16} strokeWidth={2.5} aria-hidden="true" />
        {t('commentsCount', { count: post.commentsCount })}
      </span>
    </div>
  );
}
