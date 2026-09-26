"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { tagClassFor, tagVariantFor } from "@/components/ui/Tag";
import { getCategoryLabel, ALL_CATEGORY } from "@/lib/category";
import type { PostSidebarProps } from "@my-app/shared";
import { buildPostsUrl } from "@/lib/buildPostsUrl";

export function PostSidebar({
  categories,
  tags,
  currentCategory,
  currentTag,
  children,
  zeroResults,
}: PostSidebarProps) {
  const t = useTranslations("posts");

  const tCommon = useTranslations("common");

  const [showFilter, setShowFilter] = useState(false);

  const searchParams = useSearchParams();

  const clearQ: Record<string, string | null> = zeroResults ? { q: null } : {};

  const validCategorySet = new Set(categories);

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
        {t("filter")}
        <ChevronDown
          size={14}
          strokeWidth={2.5}
          aria-hidden
          className={`ease-smooth transition-transform duration-[var(--duration-fast)] ${showFilter ? "rotate-180" : ""}`}
        />
      </Button>

      <div className="flex gap-12 max-lg:flex-col">
        <aside
          id="posts-filter-panel"
          className={`w-65 shrink-0 max-lg:w-full ${showFilter ? "block" : "hidden"} lg:block`}
        >
          <div className="content-stack-lg sticky-below-nav">
            {categories.length > 1 && (
              <div className="animate-fade-in">
                <h3 className="filter-heading mb-3">{t("categories")}</h3>
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

                          className={`ease-smooth flex w-full items-center justify-between rounded-md px-3 py-2 text-(length:--type-xs) font-medium transition-[background-color,color,box-shadow] duration-[var(--duration-fast)] ${
                            active
                              ? "bg-accent text-page shadow-(--shadow-sm)"
                              : "text-body hover:bg-btn-hover-bg hover:text-heading"
                          }`}
                        >
                          <span>
                            {name === ALL_CATEGORY
                              ? t("allCategories")
                              : getCategoryLabel(name, tCommon as (k: string) => string)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {tags.length > 0 && (
              <div className="animate-fade-in">
                <h3 className="filter-heading mb-3">{t("tags")}</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((item) => {
                    const tagName = typeof item === "string" ? item : item.name;
                    const tagCount = typeof item === "string" ? 0 : item.count;

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

                        className={`rounded-full px-3 py-1 text-(length:--type-2xs) leading-normal font-medium transition-[background-color,color,box-shadow] duration-[var(--duration-fast)] ${
                          active
                            ? "bg-accent text-page shadow-(--shadow-sm)"
                            : `${tagClassFor[tagVariantFor(tagName)]} hover:brightness-105`
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
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
