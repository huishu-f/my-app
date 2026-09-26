import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PinnedBadge } from "@/components/ui/PinnedBadge";
import { PageHeader } from "@/components/layouts/PageHeader";
import { listPostsServer, getCategoriesServer, getTagsServer } from "@server/blog/blog.cache";
import { PAGE_SIZE } from "@/config/site";
import { ALL_CATEGORY } from "@/lib/category";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Link, redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { PostSidebar } from "@/components/blog/PostSidebar";
import { PostsSearchInput } from "@/components/blog/PostsSearchInput";
import { buildPostsUrl } from "@/lib/buildPostsUrl";
import { postPath } from "@my-app/shared";
import { PostsBodySkeleton } from "@/components/skeletons/PostsBodySkeleton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [t, tMeta] = await Promise.all([getTranslations("posts"), getTranslations("meta")]);
  return {
    title: `${t("title")} · ${tMeta("siteTitle")}`,
    description: t("subtitle"),
  };
}

export const revalidate = 3600;

export default async function PostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [t, tCommon] = await Promise.all([getTranslations("posts"), getTranslations("common")]);
  const sp = await searchParams;

  const category = typeof sp.category === "string" ? sp.category : undefined;

  const tag = typeof sp.tag === "string" ? sp.tag : undefined;

  const page = Number(sp.page) || 1;

  const q = typeof sp.q === "string" ? sp.q : undefined;

  const baseParams: Record<string, string | undefined> = {
    category,
    tag,
    q,
    page: page > 1 ? String(page) : undefined,
  };

  const [postsResult, categoriesData, tagsData] = await Promise.all([
    listPostsServer({
      category: category !== ALL_CATEGORY ? category : undefined,
      tag: tag ?? undefined,
      q: q?.trim() || undefined,
      page,
      limit: PAGE_SIZE,
    }).catch(() => null),
    getCategoriesServer().catch(() => ({ categories: [] })),
    getTagsServer().catch(() => ({ tags: [] })),
  ]);

  const postsLoadError = postsResult === null;

  const categories = [ALL_CATEGORY, ...(categoriesData?.categories ?? [])];

  const tags = tagsData?.tags ?? [];

  const currentCategory = category ?? ALL_CATEGORY;

  const currentTag = tag ?? null;

  if (
    !postsLoadError &&
    postsResult &&
    page > postsResult.totalPages &&
    postsResult.totalPages > 0
  ) {
    const correctedParams = new URLSearchParams();
    for (const [k, v] of Object.entries(baseParams)) {
      if (v && k !== "page") correctedParams.set(k, v);
    }
    correctedParams.set("page", String(postsResult.totalPages));
    redirect({ href: `/posts?${correctedParams.toString()}`, locale });
  }

  const posts = postsResult?.posts ?? [];

  const total = postsResult?.total ?? 0;

  const totalPages = Math.max(1, postsResult?.totalPages ?? 1);

  const rawPage = postsResult?.page ?? page;

  const currentPage = Math.min(Math.max(1, rawPage), totalPages);

  const hasFilters = !!(q?.trim() || category || tag);

  const maxPages = Math.min(5, totalPages);

  let pageStart = Math.max(1, currentPage - 2);

  const pageEnd = Math.min(totalPages, pageStart + maxPages - 1);

  pageStart = Math.max(1, pageEnd - maxPages + 1);

  const pageNumbers = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i);

  return (
    <Container className="page-section">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Suspense fallback={<PostsBodySkeleton />}>
        <PostSidebar
          categories={categories}
          tags={tags}
          currentCategory={currentCategory}
          currentTag={currentTag}
          zeroResults={posts.length === 0}
        >
          <div className="page-actions animate-fade-in mb-6">
            <p className="text-body text-(length:--type-xs) leading-normal font-medium">
              {totalPages > 1
                ? t("totalWithPage", { count: total, current: currentPage, total: totalPages })
                : t("totalOnly", { count: total })}
            </p>
            <div className="row-md flex-wrap">
              <PostsSearchInput initialValue={q ?? ""} />
            </div>
          </div>

          {postsLoadError ? (
            <div className="animate-fade-in">
              <EmptyState
                icon={<Search size={20} strokeWidth={2.5} />}
                title={t("loadErrorTitle")}
                description={t("loadErrorDesc")}
                action={
                  <Button href="/posts" variant="ghost">
                    {tCommon("refresh")}
                  </Button>
                }
              />
            </div>
          ) : posts.length === 0 ? (
            <div className="animate-fade-in">
              <EmptyState
                icon={<Search size={20} strokeWidth={2.5} />}
                title={t("noResultsTitle")}
                description={t("noResultsDesc")}
                action={
                  hasFilters ? (
                    <Button href="/posts" variant="ghost">
                      {t("clearFilters")}
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="card-list animate-fade-in">
              {posts.map((p) => (
                <ArticleCard
                  key={p.id}
                  post={p}
                  href={postPath(p.id)}
                  tags={p.tags}
                  badge={p.pinned ? <PinnedBadge /> : undefined}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav
              className="mt-12 flex items-center justify-center gap-2"
              aria-label={t("pagination")}
            >
              {currentPage === 1 ? (
                <span
                  className="page-btn pointer-events-none w-9 opacity-40"
                  aria-label={t("prevPage")}
                >
                  <ChevronLeft size={16} />
                </span>
              ) : (
                <Link
                  href={buildPostsUrl(baseParams, {
                    page: String(Math.max(1, currentPage - 1)),
                  })}
                  className="page-btn w-9"
                  aria-label={t("prevPage")}
                >
                  <ChevronLeft size={16} />
                </Link>
              )}
              {pageNumbers.map((n) => (
                <Link
                  key={n}
                  href={buildPostsUrl(baseParams, { page: String(n) })}
                  aria-current={n === currentPage ? "page" : undefined}
                  aria-label={t("pageN", { n })}
                  className={`page-btn min-w-9 px-2.5 text-(length:--type-xs) ${
                    n === currentPage ? "page-btn-active" : ""
                  }`}
                >
                  {n}
                </Link>
              ))}
              {currentPage === totalPages ? (
                <span
                  className="page-btn pointer-events-none w-9 opacity-40"
                  aria-label={t("nextPage")}
                >
                  <ChevronRight size={16} />
                </span>
              ) : (
                <Link
                  href={buildPostsUrl(baseParams, {
                    page: String(Math.min(totalPages, currentPage + 1)),
                  })}
                  className="page-btn w-9"
                  aria-label={t("nextPage")}
                >
                  <ChevronRight size={16} />
                </Link>
              )}
            </nav>
          )}
        </PostSidebar>
      </Suspense>
    </Container>
  );
}
