/**
 * @file PostToc.tsx
 * @description 详情页侧栏目录（TOC）：从正文容器提取 h2/h3 生成目录，监听滚动计算阅读进度并高亮当前章节，点击平滑滚动定位
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { PostTocProps, TocItem } from '@my-app/shared';
import { useRafScroll } from '@/hooks/useRafScroll';

/**
 * PostToc 文章目录
 * @param props {@link PostTocProps}
 */
export function PostToc({ articleId }: PostTocProps) {
  const t = useTranslations('post');

  /** 从正文提取出的目录项 */
  const [tocItems, setTocItems] = useState<TocItem[]>([]);

  /** 当前高亮的章节标题 id */
  const [activeId, setActiveId] = useState<string>('');

  /** 阅读进度比例，取值 0~1 */
  const [progress, setProgress] = useState(0);

  /** 点击目录跳转后临时锁定 IntersectionObserver 更新的定时器，避免高亮在平滑滚动中途跳变 */
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 提取目录：查询正文内 h2/h3，为无 id 的标题回填 heading-{idx}，
   * 并在首次无高亮时默认选中第一个章节
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
   * 监听 articleId：挂载时提取一次目录，并用 MutationObserver 订阅正文 DOM 变化重提取
   * （正文可能由客户端渲染/代码高亮异步插入标题），卸载时断开观察器
   */
  useEffect(() => {
    extractHeadings();

    const article = document.getElementById(articleId);
    if (!article) return;
    const observer = new MutationObserver(() => extractHeadings());
    observer.observe(article, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [articleId]);

  /** 滚动时按 rAF 节流计算阅读进度：已滚动距离 / 可滚动总高度，封顶 1 */
  useRafScroll((_scrollY, docHeight) => {
    setProgress(docHeight > 0 ? Math.min(_scrollY / docHeight, 1) : 0);
  });

  /**
   * 监听 tocItems：用 IntersectionObserver 高亮进入视口的最上方标题；
   * scrollTimer 未清空（点击目录跳转进行中）时跳过更新，避免与手动定位竞争
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
   * 点击目录项跳转：先高亮目标并平滑滚动到位，
   * 再锁定 IntersectionObserver 更新 800ms（单位 ms），等待平滑滚动结束后恢复自动高亮
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

  /** 卸载时执行一次：清理未触发的 scrollTimer，避免卸载后回调仍执行 */
  useEffect(() => {
    return () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  /** 当前高亮章节在目录中的下标，用于展示"第 N / 共 M 节" */
  const activeIndex = tocItems.findIndex((h) => h.id === activeId);

  return (
    <aside className="hidden shrink-0 lg:block" aria-label={t('tocLabel')}>
      <div className="animate-fade-in sticky-below-nav">
        <div className="mb-5">
          <div className="meta-text mb-2 flex items-center justify-between">
            <span>{t('readingProgress')}</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="bg-stroke h-1 w-full overflow-hidden rounded-full">
            <div
              className="bg-heading h-full rounded-full transition-[width] duration-150 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {tocItems.length > 0 && (
          <>
            <div className="filter-heading mb-4 flex items-center gap-2">
              <span className="inline-block h-3 w-0.5 rounded-full bg-current opacity-50" />
              {t('toc')}
              <span className="chip-sm ml-1 tracking-normal normal-case">{tocItems.length}</span>
            </div>

            <nav className="border-stroke flex flex-col gap-1 border-l" aria-label={t('tocNav')}>
              {tocItems.map((h) => {
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
                    className={`block border-l-2 py-2 text-left leading-snug transition-[color,border-color] duration-150 ease-out ${h.sub ? 'pl-6 text-(length:--type-2xs)' : 'pl-3 text-(length:--type-xs)'} ${active ? 'border-accent text-heading -ml-px font-medium' : 'text-muted hover:border-heading hover:text-heading -ml-px border-transparent'}`}
                  >
                    <span className="block truncate">{h.text}</span>
                  </a>
                );
              })}
            </nav>

            {activeIndex >= 0 && (
              <div className="meta-text mt-4">
                {activeIndex + 1} / {tocItems.length}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
