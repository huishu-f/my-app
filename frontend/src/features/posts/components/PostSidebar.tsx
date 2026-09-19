/**
 * @file PostSidebar.tsx
 * @description 文章列表页筛选侧栏：渲染分类与标签筛选链接（含移动端折叠面板），点击时通过 buildPostsUrl 重置分页/搜索条件
 */
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { tagClassFor, tagVariantFor } from '@/ui/Tag';
import { Button } from '@/ui/Button';
import { getCategoryLabel, ALL_CATEGORY } from '@/lib/category';
import type { PostSidebarProps } from '@my-app/shared';
import { buildPostsUrl } from '@/features/posts/utils/buildPostsUrl';

/**
 * PostSidebar 列表页筛选侧栏
 * @param props {@link PostSidebarProps}
 */
export function PostSidebar({
  categories,
  tags,
  currentCategory,
  currentTag,
  children,
  zeroResults,
}: PostSidebarProps) {
  const t = useTranslations('posts');

  const tCommon = useTranslations('common');

  /** 移动端筛选面板是否展开（桌面端始终展示，仅 lg 断点以下受控） */
  const [showFilter, setShowFilter] = useState(false);

  /** 当前 URL 查询参数，作为生成筛选链接的基础 */
  const searchParams = useSearchParams();

  /** 搜索无结果时，筛选链接需一并清除 q，避免继续停留在空搜索结果上 */
  const clearQ: Record<string, string | null> = zeroResults ? { q: null } : {};

  /** 合法分类集合，用于判断当前 URL 分类是否有效 */
  const validCategorySet = new Set(categories);

  /** 当前分类不在合法列表中（如手改 URL）时，点击标签应顺带清除失效分类 */
  const shouldClearCategory = !!(currentCategory && !validCategorySet.has(currentCategory));

  return (
    <>
      <Button
        onClick={() => setShowFilter((v) => !v)}
        variant="outline"
        size="sm"
        aria-expanded={showFilter}
        aria-controls="posts-filter-panel"
        className="mb-5 lg:hidden"
      >
        {t('filter')}
        <ChevronDown
          size={14}
          strokeWidth={2.5}
          aria-hidden
          className={`transition-transform duration-150 ease-out ${showFilter ? 'rotate-180' : ''}`}
        />
      </Button>

      <div className="flex gap-12 max-lg:flex-col">
        <aside
          id="posts-filter-panel"
          className={`w-65 shrink-0 max-lg:w-full ${showFilter ? 'block' : 'hidden'} lg:block`}
        >
          <div className="content-stack-lg sticky-below-nav">
            <div className="animate-fade-in">
              <h3 className="filter-heading mb-3">{t('categories')}</h3>
              <ul className="space-y-1">
                {categories.map((name) => {
                  const active = currentCategory === name;
                  return (
                    <li key={name}>
                      <Link
                        href={buildPostsUrl(searchParams, {
                          category: name !== ALL_CATEGORY ? name : null,
                          tag: null,
                          ...clearQ,
                        })}
                        onClick={() => setShowFilter(false)}
                        aria-pressed={active}
                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-(length:--type-xs) font-medium transition-[background-color,color,box-shadow] duration-150 ease-out ${
                          active
                            ? 'bg-accent text-page shadow-(--shadow-sm)'
                            : 'text-body hover:bg-btn-hover-bg hover:text-heading'
                        }`}
                      >
                        <span>
                          {name === ALL_CATEGORY
                            ? t('allCategories')
                            : getCategoryLabel(name, tCommon as (k: string) => string)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="animate-fade-in">
              <h3 className="filter-heading mb-3">{t('tags')}</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((item) => {
                  // 标签项兼容两种形态：纯字符串 或 { name, count } 对象
                  const tagName = typeof item === 'string' ? item : item.name;
                  const tagCount = typeof item === 'string' ? 0 : item.count;

                  const active = currentTag === tagName;
                  return (
                    <Link
                      key={tagName}
                      href={buildPostsUrl(searchParams, {
                        tag: active ? null : tagName,
                        ...(shouldClearCategory ? { category: null } : {}),
                        ...clearQ,
                      })}
                      onClick={() => setShowFilter(false)}
                      aria-pressed={active}
                      className={`rounded-full px-3 py-1 text-(length:--type-2xs) leading-normal font-medium transition-[background-color,color,box-shadow] duration-150 ${
                        active
                          ? 'bg-accent text-page shadow-(--shadow-sm)'
                          : `${tagClassFor[tagVariantFor(tagName)]} hover:brightness-105`
                      }`}
                    >
                      {tagName}
                      {tagCount > 0 && <span className="ml-1.5 opacity-60">{`· ${tagCount}`}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
