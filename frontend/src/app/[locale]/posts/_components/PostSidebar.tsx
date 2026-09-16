/**
 * @file PostSidebar.tsx
 * @description 文章列表侧边栏：分类与标签筛选导航，
 *              移动端折叠为可展开面板，children 作为右侧列表内容区插槽。
 */
'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { tagClassFor, tagVariantFor } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { getCategoryLabel, ALL_CATEGORY } from '@/lib/category';
import type { PostSidebarProps } from '@my-app/shared';
import { buildPostsUrl } from '../_lib/buildPostsUrl';

/**
 * PostSidebar 文章列表侧边栏
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
  /** 通用文案翻译（分类展示名经 common.categoryNames 在展示层翻译，数据值保持原值） */
  const tCommon = useTranslations('common');
  /** 移动端筛选面板展开标记 */
  const [showFilter, setShowFilter] = useState(false);
  /** 当前 URL 搜索参数，构建筛选链接时保留既有条件 */
  const searchParams = useSearchParams();
  /** 零结果时筛选链接附带清除搜索词 q，避免无意义叠加；否则维持 q 现状（传 null=删除不影响，因 buildPostsUrl 只在值为 null/空时删 key） */
  const clearQ: Record<string, string | null> = zeroResults ? { q: null } : {};
  /** 分类集合，用于校验当前分类有效性 */
  const validCategorySet = new Set(categories);
  /** 当前分类无效（不在列表中）时，切换标签需顺带清除分类，避免无效参数叠加 */
  const shouldClearCategory = !!(currentCategory && !validCategorySet.has(currentCategory));

  return (
    <>
      {/* 移动端筛选面板开关按钮 */}
      <Button
        onClick={() => setShowFilter((v) => !v)}
        variant="ghost"
        size="sm"
        className="mb-5 lg:hidden"
      >
        {t('filter')}
      </Button>

      <div className="flex gap-12 max-lg:flex-col">
        {/* 筛选侧栏：分类与标签导航 */}
        <aside
          className={`w-65 shrink-0 max-lg:w-full ${showFilter ? 'block' : 'hidden'} lg:block`}
        >
          <div className="content-stack-lg sticky top-20">
            {/* 分类筛选区块 */}
            <div className="animate-fade-in">
              <h3 className="filter-heading mb-3">{t('categories')}</h3>
              <ul className="space-y-1">
                {/* 分类链接：选中「全部」时删除 category 参数 */}
                {categories.map((name) => {
                  /** 该分类是否为当前选中态 */
                  const active = currentCategory === name;
                  return (
                    <li key={name}>
                      <Link
                        href={buildPostsUrl(searchParams, {
                          category: name !== ALL_CATEGORY ? name : null,
                          tag: null,
                          ...clearQ,
                        })}
                        aria-pressed={active}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-(length:--type-sm) font-medium transition-[background-color,color,box-shadow] duration-150 ease-out ${
                          active
                            ? 'bg-accent text-page shadow-sm'
                            : 'text-body hover:bg-surface hover:text-heading'
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

            {/* 标签筛选区块 */}
            <div className="animate-fade-in">
              <h3 className="filter-heading mb-3">{t('tags')}</h3>
              <div className="flex flex-wrap gap-2">
                {/* 兼容字符串与 {name,count} 两种标签数据形态 */}
                {tags.map((item) => {
                  const tagName = typeof item === 'string' ? item : item.name;
                  const tagCount = typeof item === 'string' ? 0 : item.count;
                  /** 该标签是否为当前选中态（再次点击即取消） */
                  const active = currentTag === tagName;
                  return (
                    <Link
                      key={tagName}
                      href={buildPostsUrl(searchParams, {
                        tag: active ? null : tagName,
                        ...(shouldClearCategory ? { category: null } : {}),
                        ...clearQ,
                      })}
                      aria-pressed={active}
                      className={`rounded-full px-3 py-1 text-(length:--type-xs) leading-normal font-medium transition-[background-color,color,box-shadow] duration-150 ${
                        active
                          ? 'bg-accent text-page shadow-sm'
                          : `${tagClassFor[tagVariantFor(tagName)]} hover:brightness-[1.06]`
                      }`}
                    >
                      {tagName}
                      {tagCount > 0 && (
                        <span className="ml-1.5 opacity-60">{`· ${tagCount}`}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* 右侧列表内容区 */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
