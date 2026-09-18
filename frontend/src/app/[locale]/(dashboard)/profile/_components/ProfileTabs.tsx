/**
 * @file ProfileTabs.tsx
 * @description 个人中心「我的文章 / 草稿 / 收藏」标签页：切换三种文章列表视图；收藏与草稿支持操作后本地移除单项（不重新拉取）
 */
'use client';

import { useState } from 'react';
import { MessageCircle, PenLine, FileText, Bookmark, NotebookPen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ArticleCard } from '@/components/ArticleCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { RemoveFavoriteButton } from './RemoveFavoriteButton';
import { DeletePostButton } from '@/app/[locale]/posts/[id]/_components/DeletePostButton';
import type { Post } from '@my-app/shared';

/** 标签页标识：articles=我的文章 / drafts=草稿 / favorites=我的收藏 */
type Tab = 'articles' | 'drafts' | 'favorites';

/**
 * ProfileTabs 组件入参（列表元素类型 {@link Post} 已在 shared 注释，不重复展开）
 */
interface ProfileTabsProps {
  /** 我已发布的文章列表 */
  published: Post[];

  /** 初始收藏列表（作为内部状态的初始值） */
  favorites: Post[];

  /** 我的草稿列表 */
  drafts: Post[];
}

/**
 * 个人中心右侧标签页：我的文章 / 草稿 / 收藏三个列表的切换
 * @param props {@link ProfileTabsProps}
 */
export function ProfileTabs({ published, favorites, drafts }: ProfileTabsProps) {
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

  /** 本次已删除的草稿 id：与收藏同一套派生模式，删除成功后本地移除、不重新拉取 */
  const [removedDraftIds, setRemovedDraftIds] = useState<string[]>([]);

  /** 收藏列表：随 props 更新，仅剔除本次已取消的项（避免重新拉取整份收藏） */
  const favoriteList = favorites.filter((p) => !removedIds.includes(p.id));

  /** 草稿列表：随 props 更新，仅剔除本次已删除的项 */
  const draftList = drafts.filter((p) => !removedDraftIds.includes(p.id));

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
          onClick={() => setTab('drafts')}
          aria-pressed={tab === 'drafts'}
          className={`segmented-item ${tab === 'drafts' ? 'segmented-item-on' : ''}`}
        >
          {t('draftsTab', { count: draftList.length })}
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

      {tab === 'drafts' && (
        <div className="mt-10">
          {draftList.length === 0 ? (
            <EmptyState
              icon={<NotebookPen size={20} strokeWidth={2.5} />}
              title={t('noDraftsTitle')}
              description={t('noDraftsDesc')}
              action={
                <Button href="/write">
                  <PenLine size={16} strokeWidth={2.5} />
                  {t('writeArticle')}
                </Button>
              }
            />
          ) : (
            <div className="card-list">
              {draftList.map((post, i) => (
                <ArticleCard
                  key={post.id}
                  post={post}
                  // 草稿卡整卡点击进编辑器续写，而非文章详情（草稿无详情页）
                  href={`/write?id=${post.id}`}
                  index={i}
                  badge={
                    <span className="chip-sm">
                      <NotebookPen size={10} strokeWidth={2.5} />
                      {t('draftBadge')}
                    </span>
                  }
                  readMoreLabel={t('continueEditing')}
                  actions={
                    <DeletePostButton
                      postId={post.id}
                      variant="compact"
                      // 删除成功回调：登记该篇 id，派生列表与计数随之更新
                      onRemoved={() => setRemovedDraftIds((ids) => [...ids, post.id])}
                    />
                  }
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
