/**
 * @file PostsSearchInput.tsx
 * @description 文章列表搜索框：输入防抖后将关键词写入 URL 查询参数 q 并重置分页，支持一键清空
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PostsSearchInputProps } from '@my-app/shared';

/** 输入防抖时长，单位 ms；停顿超过该时长才同步关键词到 URL */
const DEBOUNCE_MS = 300;

/**
 * PostsSearchInput 搜索输入框
 * @param props {@link PostsSearchInputProps}
 */
export function PostsSearchInput({ initialValue }: PostsSearchInputProps) {
  const t = useTranslations('posts');

  const router = useRouter();

  const searchParams = useSearchParams();

  /** 输入框受控值，初值来自 URL 查询参数 q */
  const [query, setQuery] = useState(initialValue);

  /** 防抖定时器引用，保存上一次未触发的 timeout 以便取消 */
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  /**
   * 挂载/卸载时执行一次：组件卸载前清理未触发的防抖定时器，避免内存泄漏
   */
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /**
   * 监听 query：输入停顿 DEBOUNCE_MS 后同步到 URL
   * 与当前 URL 的 q 相同则跳过，避免无谓的路由替换；写入/清除 q 并重置 page 回到第一页
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

      router.replace(qs ? `/posts?${qs}` : '/posts');
    }, DEBOUNCE_MS);
  }, [query]);

  /**
   * 监听 initialValue：URL 的 q 被外部改变（如侧栏清除搜索）时回写输入框，保持受控值与地址栏一致
   */
  useEffect(() => {
    if (initialValue !== query) {
      setQuery(initialValue);
    }
  }, [initialValue]);

  /** 清空按钮：立即清空输入并从 URL 移除 q 与 page（不走防抖） */
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
      <input
        id="posts-search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="border-stroke-strong bg-card-bg text-body placeholder:text-faint input-focus h-10 w-full max-w-50 rounded-md border py-0 pr-9 pl-9 text-(length:--type-xs) leading-normal"
      />
      {query && (
        <button
          type="button"
          onClick={clearSearch}
          aria-label={t('clearSearch')}
          className="text-faint hover:bg-btn-hover-bg hover:text-heading absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full transition-colors duration-150"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
