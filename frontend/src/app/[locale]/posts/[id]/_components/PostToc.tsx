/**
 * @file PostToc.tsx
 * @description 文章目录侧边栏：从渲染后的 DOM 提取 h2/h3 构建目录，
 *              IntersectionObserver 高亮当前章节，滚动进度条展示阅读进度；
 *              点击目录项平滑滚动到对应标题。
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { PostTocProps, TocItem } from '@my-app/shared';
import { useRafScroll } from '@/hooks/useRafScroll';

/**
 * PostToc 文章目录侧边栏
 * @param props {@link PostTocProps}
 */
export function PostToc({ articleId }: PostTocProps) {
  /** 文章文案翻译函数 */
  const t = useTranslations('post');
  /** 目录标题项列表（从 DOM 提取） */
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  /** 当前高亮的标题 ID */
  const [activeId, setActiveId] = useState<string>('');
  /** 阅读进度（0-1） */
  const [progress, setProgress] = useState(0);
  /**
   * 滚动防抖定时器引用，用于点击目录跳转时暂停 IntersectionObserver 高亮
   */
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 从渲染后的 DOM 中提取 h2/h3 标题构建目录项
   */
  const extractHeadings = useCallback(() => {
    const article = document.getElementById(articleId);
    if (!article) return;
    const headings = Array.from(
      article.querySelectorAll('.article-content h2, .article-content h3'),
    ) as HTMLHeadingElement[];
    const items: TocItem[] = headings.map((h, idx) => {
      if (!h.id) h.id = `heading-${idx}`;
      return { id: h.id, text: h.textContent || '', sub: h.tagName === 'H3' };
    });
    setTocItems(items);
    setActiveId((prev) => prev || (items.length > 0 ? items[0].id : ''));
  }, [articleId]);

  /**
   * 初始化提取标题并监听 DOM 变化，动态更新目录
   */
  useEffect(() => {
    extractHeadings();
    // 监听 DOM 子树变化（评论计数等动态更新），重新提取 heading 文本
    const article = document.getElementById(articleId);
    if (!article) return;
    const observer = new MutationObserver(() => extractHeadings());
    observer.observe(article, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  /**
   * 滚动进度计算 — 独立于标题，无标题时也正常工作
   */
  useRafScroll((_scrollY, docHeight) => {
    setProgress(docHeight > 0 ? Math.min(_scrollY / docHeight, 1) : 0);
  });

  /**
   * 监听标题可见性变化高亮当前章节
   */
  useEffect(() => {
    if (tocItems.length === 0) return;
    const headings = tocItems
      .map((h) => document.getElementById(h.id))
      .filter(Boolean) as HTMLElement[];
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollTimer.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );
    headings.forEach((h) => observer.observe(h));

    return () => observer.disconnect();
  }, [tocItems]);

  /**
   * 平滑滚动到指定标题
   * @param headingId 标题元素 ID
   */
  const scrollToHeading = useCallback((headingId: string) => {
    const el = document.getElementById(headingId);
    if (!el) return;
    setActiveId(headingId);
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      scrollTimer.current = null;
    }, 800);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  /**
   * 组件卸载时清除滚动防抖定时器
   */
  useEffect(() => {
    return () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  /** 当前高亮标题在目录中的索引 */
  const activeIndex = tocItems.findIndex((h) => h.id === activeId);

  return (
    <aside className="toc hidden w-56 shrink-0 lg:block" aria-label={t('tocLabel')}>
      <div className="animate-fade-in sticky top-20 hidden lg:block">
        {/* 阅读进度条 — 即使无标题也显示，不依赖 tocItems */}
        <div className="mb-5">
          <div className="text-faint mb-2 flex items-center justify-between text-(length:--type-2xs)">
            <span>{t('readingProgress')}</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="bg-stroke h-0.75 w-full overflow-hidden rounded-full">
            <div
              className="bg-heading h-full rounded-full transition-[width] duration-150 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* 目录 — 无标题时隐藏目录区域，仅保留进度条 */}
        {tocItems.length > 0 && (
          <>
            <div className="toc-label text-faint mb-4 flex items-center gap-2 text-(length:--type-xs) leading-normal font-semibold tracking-[0.05em] uppercase">
              <span className="inline-block h-3 w-0.5 rounded-full bg-current opacity-50" />
              {t('toc')}
              <span className="bg-stroke text-muted ml-1 rounded-full px-2 py-px text-(length:--type-2xs) font-medium tracking-normal normal-case">
                {tocItems.length}
              </span>
            </div>

            <nav
              className="toc-list border-stroke flex flex-col gap-1 border-l"
              aria-label={t('tocNav')}
            >
              {/* 目录项：h3 缩进为子级，当前项高亮左边框 */}
              {tocItems.map((h) => {
                /** 该标题是否为当前高亮项 */
                const active = activeId === h.id;
                return (
                  <a
                    key={h.id}
                    href={`#${h.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToHeading(h.id);
                    }}
                    aria-current={active ? 'location' : undefined}
                    aria-label={h.text}
                    title={h.text}
                    className={`toc-item block border-l-2 py-2 text-left leading-snug transition-all duration-150 ease-out ${
                      h.sub ? 'pl-6 text-(length:--type-xs)' : 'pl-3 text-(length:--type-sm)'
                    } ${
                      active
                        ? 'border-accent text-heading -ml-px font-medium'
                        : 'text-muted hover:border-heading hover:text-heading -ml-px border-transparent transition-colors duration-150 ease-out'
                    }`}
                  >
                    <span className="block truncate">{h.text}</span>
                  </a>
                );
              })}
            </nav>

            {activeIndex >= 0 && (
              <div className="text-faint mt-4 text-(length:--type-2xs)">
                {activeIndex + 1} / {tocItems.length}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
