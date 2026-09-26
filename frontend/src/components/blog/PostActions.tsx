"use client";

import { useOptimistic, useTransition } from "react";
import { Heart, Bookmark, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToggleLike, useToggleFavorite } from "@/hooks/usePosts";
import { usePostPageAuth } from "@/hooks/usePostPageAuth";
import { usePostState } from "./PostStateProvider";
import { formatCount } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import type { PostActionsProps } from "@my-app/shared";

interface OptimisticState {
  likes: number;

  favorites: number;

  liked: boolean;

  favorited: boolean;
}

export function PostActions({ user: ssrUser }: PostActionsProps) {
  const t = useTranslations("post");

  const likeMutation = useToggleLike();

  const favoriteMutation = useToggleFavorite();

  const { post } = usePostState();

  const { user, updatePost, requireAuth } = usePostPageAuth(post.id, ssrUser);

  const liked = !!user?.likedArticles?.includes(post.id);

  const favorited = !!user?.favoritedArticles?.includes(post.id);

  const guestCls = !user ? "opacity-60" : "";

  const [optimisticState, addOptimistic] = useOptimistic<OptimisticState, Partial<OptimisticState>>(
    { likes: post.likes, favorites: post.favorites ?? 0, liked, favorited },
    (current, update) => ({
      ...current,
      ...update,
    }),
  );

  const [isLikePending, startLikeTransition] = useTransition();

  const [isFavPending, startFavTransition] = useTransition();

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
        }
      });
    });
  };

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
        }
      });
    });
  };

  return (
    <div className="row-md border-stroke mt-8 flex-wrap border-t border-b py-8">
      <Button
        variant={optimisticState.liked ? "primary" : "outline"}
        size="md"
        onClick={toggleLike}
        loading={isLikePending}
        disabled={isLikePending || isFavPending}
        aria-pressed={optimisticState.liked}
        title={!user ? t("loginToLike") : undefined}
        className={`rounded-full ${guestCls}`}
      >
        {!user && <span className="sr-only">{t("loginToLike")}</span>}
        <Heart
          size={16}
          strokeWidth={2.5}
          className={optimisticState.liked ? "fill-current" : ""}
          aria-hidden="true"
        />
        {optimisticState.liked ? t("liked") : t("like")} · {formatCount(optimisticState.likes)}
      </Button>

      <Button
        variant={optimisticState.favorited ? "primary" : "outline"}
        size="md"
        onClick={toggleFavorite}
        loading={isFavPending}
        disabled={isLikePending || isFavPending}
        aria-pressed={optimisticState.favorited}
        title={!user ? t("loginToFavorite") : undefined}
        className={`rounded-full ${guestCls}`}
      >
        {!user && <span className="sr-only">{t("loginToFavorite")}</span>}
        <Bookmark
          size={16}
          strokeWidth={2.5}
          className={optimisticState.favorited ? "fill-current" : ""}
          aria-hidden="true"
        />
        {optimisticState.favorited ? t("favorited") : t("favorite")} ·{" "}
        {formatCount(optimisticState.favorites)}
      </Button>

      <span className="text-muted inline-flex items-center gap-1.5 text-(length:--type-xs)">
        <MessageCircle size={16} strokeWidth={2.5} aria-hidden="true" />
        {t("commentsCount", { count: post.commentsCount })}
      </span>
    </div>
  );
}
