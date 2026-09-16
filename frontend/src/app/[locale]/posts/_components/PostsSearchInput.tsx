/**
 * @file PostsSearchInput.tsx
 * @description 文章列表搜索输入框：输入防抖 300ms 后以 replace 更新 URL 的 q 参数，
 *              外部 URL 变化（清除筛选等）时反向同步输入框值。
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PostsSearchInputProps } from '@my-app/shared';

/** 防抖延迟（ms） */
const DEBOUNCE_MS = 300;

/**
 * PostsSearchInput 文章搜索输入框
 * @param props {@link PostsSearchInputProps}
 */
export function PostsSearchInput({ initialValue }: PostsSearchInputProps) {
  /** 列表页文案翻译函数 */
  const t = useTranslations('posts');
  /** 国际化路由实例，用于 replace 更新 URL */
  const router = useRouter();
  /** 当前 URL 搜索参数，构建搜索 URL 时保留既有条件 */
  const searchParams = useSearchParams();
  /** 当前搜索输入值 */
  const [query, setQuery] = useState(initialValue);
  /**
   * 防抖定时器引用，组件卸载时清理避免触发路由跳转
   */
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  /**
   * 组件卸载时清理防抖定时器，避免卸载后仍触发路由跳转
   */
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /**
   * 防抖更新 URL 搜索参数：query 变化后延迟 300ms，
   * 与 URL 现值相同则跳过；写入 q、清空 page，用 replace 避免每敲一轮字就进一条历史
   */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const urlQ = params.get('q') ?? '';
      if (query.trim() === urlQ) return;
      if (query.trim()) params.set('q', query.trim());
      else params.delete('q');
      params.delete('page');
      const qs = params.toString();
      // replace 而非 push：搜索每敲一轮就进一条历史的话，返回键要连按 N 次
      // 才能走出输入过程（手机端侧滑返回尤其明显）；URL 状态照常被书签/分享
      router.replace(qs ? `/posts?${qs}` : '/posts');
    }, DEBOUNCE_MS);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 外部 URL 参数变化时同步内部输入值（如清除筛选）
   */
  useEffect(() => {
    if (initialValue !== query) {
      setQuery(initialValue);
    }
  }, [initialValue]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 清除搜索词并跳回无 q 的列表
   */
  const clearSearch = () => {
    setQuery('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('page');
    const qs = params.toString();
    router.replace(qs ? `/posts?${qs}` : '/posts');
  };

  return (
    <div className="relative flex items-center">
      <Search
        size={16}
        strokeWidth={2.5}
        className="text-faint pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
      />
      {/* 搜索输入框 */}
      <input
        id="posts-search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="border-stroke-strong bg-page text-body placeholder:text-faint input-focus h-10 w-full max-w-50 rounded-lg border py-0 pr-3 pl-9 text-(length:--type-sm) leading-normal"
      />
      {/* 清除按钮：有输入时展示 */}
      {query && (
        <button
          type="button"
          onClick={clearSearch}
          aria-label={t('clearSearch')}
          className="text-faint hover:bg-surface hover:text-heading absolute top-1/2 right-2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full transition-colors duration-150"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
