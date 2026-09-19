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

  /**
   * 用户正在编辑的草稿：非 null 时输入框只认它，null 时输入框跟随 URL。
   *
   * 必须让编辑期间的输入框完全不受 URL 影响，否则会被「回包乱序」吃掉字符：
   * 防抖在每个停顿处各提交一次，写 q=Zo 的回包比用户敲下 d 更晚到达时，
   * 把 initialValue 照单回写成输入框的值就会把 d 抹掉（实测慢网络下敲 "Zod" 被回写成 "Zo"，
   * 且地址栏停在 q=Zod —— 输入框与地址栏互相矛盾）。
   */
  const [draft, setDraft] = useState<string | null>(null);

  /** 输入框展示值：编辑中优先草稿，否则跟随 URL，因此侧栏改筛选、浏览器后退都能同步回来 */
  const value = draft ?? initialValue;

  /** 防抖定时器引用，保存上一次未触发的 timeout 以便取消 */
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  /** 始终指向最新的 URL 查询参数：供防抖定时器触发时读取，既能拿到最新值，也无需把每次导航都换实例的 searchParams 写进依赖 */
  const searchParamsRef = useRef(searchParams);

  /**
   * URL 追上草稿后交还控制权：此后输入框重新跟随 URL。
   * 两边相等时切换数据源不产生任何视觉跳变，因此这里不会闪回旧值。
   */
  if (draft !== null && initialValue.trim() === draft.trim()) setDraft(null);

  /**
   * 挂载/卸载时执行一次：组件卸载前清理未触发的防抖定时器，避免内存泄漏
   */
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // 每次渲染后同步最新的查询参数供防抖定时器读取（仅赋值给 ref，无需依赖数组）
  useEffect(() => {
    searchParamsRef.current = searchParams;
  });

  /**
   * 监听草稿：输入停顿 DEBOUNCE_MS 后同步到 URL（清空按钮也只是把草稿置空，共用这一条提交路径）
   * 与当前 URL 的 q 相同则跳过，避免无谓的路由替换；写入/清除 q 并重置 page 回到第一页
   * 依赖只留 draft 与 router：searchParams 的实例随每次导航更换，写进依赖会让定时器被反复重置
   */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (draft === null) return;

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      const urlQ = params.get('q') ?? '';
      const next = draft.trim();
      if (next === urlQ) return;
      if (next) params.set('q', next);
      else params.delete('q');
      params.delete('page');
      const qs = params.toString();

      router.replace(qs ? `/posts?${qs}` : '/posts');
    }, DEBOUNCE_MS);
  }, [draft, router]);

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
        value={value}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="border-stroke-strong bg-card-bg text-body placeholder:text-faint input-focus h-10 w-full max-w-50 rounded-md border py-0 pr-9 pl-9 text-(length:--type-xs) leading-normal"
      />
      {value && (
        <button
          type="button"
          onClick={() => setDraft('')}
          aria-label={t('clearSearch')}
          className="text-faint hover:bg-btn-hover-bg hover:text-heading absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full transition-colors duration-150"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
