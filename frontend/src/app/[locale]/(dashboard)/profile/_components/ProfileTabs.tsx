/**
 * @file ProfileTabs.tsx
 * @description 个人中心 Tab 切换组件，切换 文章/收藏 两个面板
 */
'use client';

import { useState } from 'react';
import { MessageCircle, PenLine, FileText, Bookmark } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ArticleCard } from '@/components/ArticleCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { RemoveFavoriteButton } from './RemoveFavoriteButton';
import type { Post } from '@my-app/shared';

/**
 * Tab 面板类型：文章/收藏
 */
type Tab = 'articles' | 'favorites';

/**
 * ProfileTabs 组件入参
 */
interface ProfileTabsProps {
  /** 已发布文章列表 */
  published: Post[];
  /** 收藏文章列表 */
  favorites: Post[];
}

/**
 * ProfileTabs 文章/收藏 Tab 切换面板
 * @param props {@link ProfileTabsProps}
 */
export function ProfileTabs({ published, favorites }: ProfileTabsProps) {
  /** 当前激活的 Tab 面板 */
  const t = useTranslations('profile');
  const [tab, setTab] = useState<Tab>('articles');
  /** 收藏列表本地态：取消收藏后即时剔除该项，避免整页刷新（SSR props 仅作初始值） */
  const [favoriteList, setFavoriteList] = useState(favorites);

  return (
    <div className="min-w-0">
      {/* Tab 切换 */}
      <div className="segmented animate-fade-in">
        <button
          onClick={() => setTab('articles')}
          className={`segmented-item ${tab === 'articles' ? 'segmented-item-on' : ''}`}
        >
          {t('articlesTab', { count: published.length })}
        </button>
        <button
          onClick={() => setTab('favorites')}
          className={`segmented-item ${tab === 'favorites' ? 'segmented-item-on' : ''}`}
        >
          {t('favoritesTab', { count: favoriteList.length })}
        </button>
      </div>

      {/* 文章列表 — Tab 条件渲染会 remount，不携带入场动画以保证切换即时 */}
      {tab === 'articles' && (
        <div className="mt-10">
          {published.length === 0 ? (
            <EmptyState
              icon={<FileText size={20} strokeWidth={2.5} />}
              title={t('noArticlesTitle')}
              description={t('noArticlesDesc')}
              action={
                <Button href="/write">
                  <PenLine size={16} strokeWidth={2.5} />
                  {t('writeArticle')}
                </Button>
              }
            />
          ) : (
            <div className="card-list">
              {published.map((post, i) => (
                <ArticleCard
                  key={post.id}
                  post={post}
                  href={`/posts/${post.id}`}
                  index={i}
                  extraStats={[
                    { icon: <MessageCircle size={12} strokeWidth={2.5} />, value: post.commentsCount || 0 },
                  ]}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 收藏列表 — 同上，切换即时 */}
      {tab === 'favorites' && (
        <div className="mt-10">
          {favoriteList.length === 0 ? (
            <EmptyState
              icon={<Bookmark size={20} strokeWidth={2.5} />}
              title={t('noFavoritesTitle')}
              description={t('noFavoritesDesc')}
            />
          ) : (
            <div className="card-list">
              {favoriteList.map((post, i) => (
                <ArticleCard
                  key={post.id}
                  post={post}
                  href={`/posts/${post.id}`}
                  index={i}
                  actions={
                    <RemoveFavoriteButton
                      postId={post.id}
                      onRemoved={() =>
                        setFavoriteList((list) => list.filter((p) => p.id !== post.id))
                      }
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
