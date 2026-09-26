"use client";

import { Eye, Heart, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatCount } from "@/lib/format";
import { usePostState } from "./PostStateProvider";

export function PostHeadStats() {
  const { post } = usePostState();
  const t = useTranslations("post");

  return (
    <div className="row-md text-muted ml-auto text-(length:--type-xs) leading-normal">
      <span className="row-xs" aria-label={`${t("views" as never)} ${formatCount(post.views)}`}>
        <Eye size={14} strokeWidth={2.5} aria-hidden="true" />
        {formatCount(post.views)}
      </span>
      <span className="meta-dot" aria-hidden="true" />
      <span className="row-xs" aria-label={`${t("likes" as never)} ${formatCount(post.likes)}`}>
        <Heart size={14} strokeWidth={2.5} aria-hidden="true" />
        {formatCount(post.likes)}
      </span>
      <span className="meta-dot" aria-hidden="true" />
      <span className="row-xs" aria-label={`${t("commentsCount", { count: post.commentsCount })}`}>
        <MessageCircle size={14} strokeWidth={2.5} aria-hidden="true" />
        {formatCount(post.commentsCount)}
      </span>
    </div>
  );
}
