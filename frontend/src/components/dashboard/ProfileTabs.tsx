"use client";

import { useState } from "react";
import { MessageCircle, PenLine, FileText, Bookmark, NotebookPen } from "lucide-react";
import { useTranslations } from "next-intl";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { RemoveFavoriteButton } from "./RemoveFavoriteButton";
import { DeletePostButton } from "@/components/blog/DeletePostButton";
import { postEditPath, postPath } from "@my-app/shared";
import type { Post } from "@my-app/shared";

type Tab = "articles" | "drafts" | "favorites";

interface ProfileTabsProps {
  published: Post[];

  favorites: Post[];

  drafts: Post[];
}

export function ProfileTabs({ published, favorites, drafts }: ProfileTabsProps) {
  const t = useTranslations("profile");

  const [tab, setTab] = useState<Tab>("articles");

  const [removedIds, setRemovedIds] = useState<string[]>([]);

  const [removedDraftIds, setRemovedDraftIds] = useState<string[]>([]);

  const favoriteList = favorites.filter((p) => !removedIds.includes(p.id));

  const draftList = drafts.filter((p) => !removedDraftIds.includes(p.id));

  return (
    <div className="min-w-0">
      <div className="segmented animate-fade-in">
        <button
          type="button"
          onClick={() => setTab("articles")}
          role="tab"
          aria-selected={tab === "articles"}
          className={`segmented-item ${tab === "articles" ? "segmented-item-on" : ""}`}
        >
          {t("articlesTab", { count: published.length })}
        </button>
        <button
          type="button"
          onClick={() => setTab("drafts")}
          role="tab"
          aria-selected={tab === "drafts"}
          className={`segmented-item ${tab === "drafts" ? "segmented-item-on" : ""}`}
        >
          {t("draftsTab", { count: draftList.length })}
        </button>
        <button
          type="button"
          onClick={() => setTab("favorites")}
          role="tab"
          aria-selected={tab === "favorites"}
          className={`segmented-item ${tab === "favorites" ? "segmented-item-on" : ""}`}
        >
          {t("favoritesTab", { count: favoriteList.length })}
        </button>
      </div>

      {tab === "articles" && (
        <div className="mt-10">
          {published.length === 0 ? (
            <EmptyState
              icon={<FileText size={20} strokeWidth={2.5} />}
              title={t("noArticlesTitle")}
              description={t("noArticlesDesc")}
              action={
                <Button href="/write">
                  <PenLine size={16} strokeWidth={2.5} />
                  {t("writeArticle")}
                </Button>
              }
            />
          ) : (
            <div className="card-list">
              {published.map((post) => (
                <ArticleCard
                  key={post.id}
                  post={post}
                  href={postPath(post.id)}
                  extraStats={[
                    {
                      icon: <MessageCircle size={12} strokeWidth={2.5} />,
                      value: post.commentsCount || 0,
                    },
                  ]}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "drafts" && (
        <div className="mt-10">
          {draftList.length === 0 ? (
            <EmptyState
              icon={<NotebookPen size={20} strokeWidth={2.5} />}
              title={t("noDraftsTitle")}
              description={t("noDraftsDesc")}
              action={
                <Button href="/write">
                  <PenLine size={16} strokeWidth={2.5} />
                  {t("writeArticle")}
                </Button>
              }
            />
          ) : (
            <div className="card-list">
              {draftList.map((post) => (
                <ArticleCard
                  key={post.id}
                  post={post}
                  href={postEditPath(post.id)}
                  badge={
                    <span className="chip-sm">
                      <NotebookPen size={10} strokeWidth={2.5} />
                      {t("draftBadge")}
                    </span>
                  }
                  readMoreLabel={t("continueEditing")}
                  actions={
                    <DeletePostButton
                      postId={post.id}
                      variant="compact"
                      onRemoved={() => setRemovedDraftIds((ids) => [...ids, post.id])}
                    />
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "favorites" && (
        <div className="mt-10">
          {favoriteList.length === 0 ? (
            <EmptyState
              icon={<Bookmark size={20} strokeWidth={2.5} />}
              title={t("noFavoritesTitle")}
              description={t("noFavoritesDesc")}
              action={
                <Button href="/posts" variant="ghost">
                  {t("browsePosts" as never)}
                </Button>
              }
            />
          ) : (
            <div className="card-list">
              {favoriteList.map((post) => (
                <ArticleCard
                  key={post.id}
                  post={post}
                  href={postPath(post.id)}
                  actions={
                    <RemoveFavoriteButton
                      postId={post.id}
                      onRemoved={() => setRemovedIds((ids) => [...ids, post.id])}
                    />
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
