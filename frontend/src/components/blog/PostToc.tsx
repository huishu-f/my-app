"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import type { PostTocProps, TocItem } from "@my-app/shared";
import { useRafScroll } from "@/hooks/useRafScroll";

export function PostToc({ articleId }: PostTocProps) {
  const t = useTranslations("post");

  const [tocItems, setTocItems] = useState<TocItem[]>([]);

  const [activeId, setActiveId] = useState<string>("");

  const [progress, setProgress] = useState(0);

  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const extractHeadings = useCallback(() => {
    const article = document.getElementById(articleId);
    if (!article) return;
    const headings = Array.from(
      article.querySelectorAll(".article-content h2, .article-content h3"),
    ) as HTMLHeadingElement[];
    const items: TocItem[] = headings.map((h, idx) => {
      if (!h.id) h.id = `heading-${idx}`;
      return { id: h.id, text: h.textContent || "", sub: h.tagName === "H3" };
    });
    setTocItems(items);
    setActiveId((prev) => prev || (items.length > 0 ? items[0].id : ""));
  }, [articleId]);

  useEffect(() => {
    extractHeadings();

    const article = document.getElementById(articleId);
    if (!article) return;
    const observer = new MutationObserver(() => extractHeadings());
    observer.observe(article, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [articleId, extractHeadings]);

  useRafScroll((_scrollY, docHeight) => {
    setProgress(docHeight > 0 ? Math.min(_scrollY / docHeight, 1) : 0);
  });

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
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    headings.forEach((h) => observer.observe(h));

    return () => observer.disconnect();
  }, [tocItems]);

  const scrollToHeading = useCallback((headingId: string) => {
    const el = document.getElementById(headingId);
    if (!el) return;
    setActiveId(headingId);
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      scrollTimer.current = null;
    }, 800);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  const activeIndex = tocItems.findIndex((h) => h.id === activeId);

  return (
    <aside className="hidden shrink-0 lg:block" aria-label={t("tocLabel")}>
      <div className="animate-fade-in sticky-below-nav">
        <div className="mb-5">
          <div className="meta-text mb-2 flex items-center justify-between">
            <span>{t("readingProgress")}</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>

          <div className="bg-stroke h-1 w-full overflow-hidden rounded-full">
            <div
              className="bg-heading ease-smooth h-full rounded-full transition-[width] duration-[var(--duration-fast)]"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {tocItems.length > 0 && (
          <>
            <div className="filter-heading mb-4 flex items-center gap-2">
              <span className="inline-block h-3 w-0.5 rounded-full bg-current opacity-50" />
              {t("toc")}
              <span className="chip-sm ml-1 tracking-normal normal-case">{tocItems.length}</span>
            </div>

            <nav className="border-stroke flex flex-col gap-1 border-l" aria-label={t("tocNav")}>
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
                    aria-current={active ? "location" : undefined}
                    aria-label={h.text}
                    title={h.text}
                    className={`ease-smooth block border-l-2 py-2 text-left leading-snug transition-[color,border-color] duration-[var(--duration-fast)] ${h.sub ? "pl-6 text-(length:--type-2xs)" : "pl-3 text-(length:--type-xs)"} ${active ? "border-accent text-heading -ml-px font-medium" : "text-muted hover:border-heading hover:text-heading -ml-px border-transparent"}`}
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
