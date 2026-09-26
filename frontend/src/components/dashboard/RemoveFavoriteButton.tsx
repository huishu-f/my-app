"use client";

import { BookmarkX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToggleFavorite } from "@/hooks/usePosts";
import type { PostIdProps } from "@my-app/shared";

interface RemoveFavoriteButtonProps extends PostIdProps {
  onRemoved?: () => void;
}

export function RemoveFavoriteButton({ postId, onRemoved }: RemoveFavoriteButtonProps) {
  const t = useTranslations("profile");

  const toggleFavoriteMutation = useToggleFavorite();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={toggleFavoriteMutation.isPending}
      onClick={() =>
        toggleFavoriteMutation.mutate(postId, {
          onSuccess: () => onRemoved?.(),
        })
      }
    >
      {toggleFavoriteMutation.isPending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <BookmarkX data-icon="inline-start" size={14} strokeWidth={2.5} />
      )}
      {t("removeFavorite")}
    </Button>
  );
}
