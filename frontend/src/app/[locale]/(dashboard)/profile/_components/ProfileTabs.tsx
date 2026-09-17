/**
 * @file ProfileTabs.tsx
 * @description 个人中心「我的文章 / 收藏」标签页：切换两种文章列表视图，收藏支持取消后本地移除单项（不重新拉取）
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

/** 标签页标识：articles=我的文章 / favorites=我的收藏 */
type Tab = 'articles' | 'favorites';

/**
 * ProfileTabs 组件入参（列表元素类型 {@link Post} 已在 shared 注释，不重复展开）
 */
interface ProfileTabsProps {
  /** 我已发布的文章列表 */
  published: Post[];

  /** 初始收藏列表（作为内部状态的初始值） */
  favorites: Post[];
}

/**
 * 个人中心右侧标签页：我的文章 / 收藏两个列表的切换
 * @param props {@link ProfileTabsProps}
 */
export function ProfileTabs({ published, favorites }: ProfileTabsProps) {
  const t = useTranslations('profile');

  /** 当前激活的标签页，默认「我的文章」 */
  const [tab, setTab] = useState<Tab>('articles');

  /**
   * 本次已取消收藏的文章 id：取消收藏成功后只在这里登记，
   * 让 favoriteList 从 props 派生 —— 早期版本用 useState(favorites) 拷贝 props，
   * 而 ProfileTabs 在收藏数据回来之前就已挂载（先以空数组渲染），useState 只在首次渲染取值，
   * 之后 props 更新不会再同步，导致收藏计数恒为 0
   */
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  /** 收藏列表：随 props 更新，仅剔除本次已取消的项（避免重新拉取整份收藏） */
  const favoriteList = favorites.filter((p) => !removedIds.includes(p.id));

  return (
    <div className="min-w-0">
      <div className="segmented animate-fade-in">
        <button
          type="button"
          onClick={() => setTab('articles')}
          aria-pressed={tab === 'articles'}
          className={`segmented-item ${tab === 'articles' ? 'segmented-item-on' : ''}`}
        >
          {t('articlesTab', { count: published.length })}
        </button>
        <button
          type="button"
          onClick={() => setTab('favorites')}
          aria-pressed={tab === 'favorites'}
          className={`segmented-item ${tab === 'favorites' ? 'segmented-item-on' : ''}`}
        >
          {t('favoritesTab', { count: favoriteList.length })}
        </button>
      </div>

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
                      // 取消收藏成功回调：登记该篇 id，派生列表与计数随之更新
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
