/**
 * @file PostActions.tsx
 * @description 文章操作栏：点赞/收藏按钮（乐观更新）与评论数展示，
 *              未登录点击时经 requireAuth 引导登录。
 */
'use client';

import { useOptimistic, useTransition } from 'react';
import { Heart, Bookmark, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from '@/lib/toast';
import { useToggleLike, useToggleFavorite } from '@/services/blog/hooks';
import { usePostPageAuth } from '@/hooks/usePostPageAuth';
import { usePostState } from './PostStateProvider';
import { formatCount } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import type { PostActionsProps } from '@my-app/shared';

/**
 * 乐观更新状态：包含点赞/收藏的 UI 展示数据
 */
interface OptimisticState {
  /** 点赞数 */
  likes: number;
  /** 收藏数 */
  favorites: number;
  /** 当前用户是否已点赞 */
  liked: boolean;
  /** 当前用户是否已收藏 */
  favorited: boolean;
}

/**
 * PostActions 文章操作栏组件
 * @param props.user SSR 传入的用户，作客户端登录态初始兜底
 */
export function PostActions({ user: ssrUser }: PostActionsProps) {
  /** 文章文案翻译函数 */
  /** 文章文案翻译函数 */
  const t = useTranslations('post');
  /** 点赞 mutation 实例 */
  const likeMutation = useToggleLike();
  /** 收藏 mutation 实例 */
  const favoriteMutation = useToggleFavorite();

  /** 文章展示态（计数与状态来源） */
  const { post } = usePostState();
  /** 详情页鉴权 + 状态更新 + 登录拦截三合一 hook */
  const { user, updatePost, requireAuth } = usePostPageAuth(post.id, ssrUser);

  /** 当前用户是否已点赞（基于用户数据派生） */
  const liked = !!user?.likedArticles?.includes(post.id);
  /** 当前用户是否已收藏（基于用户数据派生） */
  const favorited = !!user?.favoritedArticles?.includes(post.id);
  /** 未登录时按钮降透明度提示 */
  const guestCls = !user ? 'opacity-60' : '';

  /** 乐观状态：基于实际 post + liked/favorited 派生，transition 中 addOptimistic 即时更新 */
  const [optimisticState, addOptimistic] = useOptimistic<
    Omit<OptimisticState, never>,
    Partial<OptimisticState>
  >({ likes: post.likes, favorites: post.favorites ?? 0, liked, favorited }, (current, update) => ({
    ...current,
    ...update,
  }));

  /** 点赞过渡状态与启动器，乐观更新期间 isPending 为 true（控制按钮禁用/加载） */
  const [isLikePending, startLikeTransition] = useTransition();
  /** 收藏过渡状态与启动器，独立于点赞，避免互相阻塞 */
  const [isFavPending, startFavTransition] = useTransition();

  /**
   * 切换点赞 — 乐观更新，点击瞬间 UI 即时反映新状态（点赞数±1、按钮高亮），
   * API 完成后 updatePost 确认实际值；失败自动回退到实际状态
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
   * 切换收藏 — 乐观更新：瞬间切换收藏态与计数 ±1，API 确认后 updatePost 校准，失败自动回退
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
      {/* 点赞 / 取消点赞按钮 */}
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

      {/* 收藏 / 取消收藏按钮 */}
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
        {optimisticState.favorited ? t('favorited') : t('favorite')} · {formatCount(optimisticState.favorites)}
      </Button>

      {/* 评论数展示 */}
      <span className="text-muted inline-flex items-center gap-1.5 text-(length:--type-sm)">
        <MessageCircle size={16} strokeWidth={2.5} />
        {t('commentsCount', { count: post.commentsCount })}
      </span>
    </div>
  );
}
