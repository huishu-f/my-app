/**
 * @file page.tsx
 * @description 文章列表页，支持分类/标签筛选、搜索、分页
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { ArticleCard } from '@/components/ArticleCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { PinnedBadge } from '@/components/ui/PinnedBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  listPostsServer,
  getCategoriesServer,
  getTagsServer,
} from '@/services/blog/server';
import { PAGE_SIZE } from '@/config/site';
import { Suspense } from 'react';
import { PostSidebar } from './_components/PostSidebar';
import { PostsSearchInput } from './_components/PostsSearchInput';
import { buildPostsUrl } from './_lib/buildPostsUrl';

/** 文章列表页 SEO 元数据 */
export const metadata: Metadata = {
  title: '全部文章 · 我的博客',
  description: '浏览所有已发布内容，按分类或标签筛选你感兴趣的话题。',
};

/** 列表页 ISR 重新验证间隔（秒） */
export const revalidate = 60;

/**
 * PostsPage 文章列表页
 * 服务端渲染文章列表，支持分类/标签筛选、关键词搜索与分页；页码越界时自动重定向到末页
 * @param searchParams 路由查询参数（分类/标签/关键词/页码）
 */
export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const category = typeof sp.category === 'string' ? sp.category : undefined;
  const tag = typeof sp.tag === 'string' ? sp.tag : undefined;
  const page = Number(sp.page) || 1;
  const q = typeof sp.q === 'string' ? sp.q : undefined;

  const baseParams: Record<string, string | undefined> = {
    category,
    tag,
    q,
    page: page > 1 ? String(page) : undefined,
  };

  const [postsResult, categoriesData, tagsData] = await Promise.all([
    listPostsServer({
      category: category !== '全部' ? category : undefined,
      tag: tag ?? undefined,
      q: q?.trim() || undefined,
      page,
      limit: PAGE_SIZE,
    }).catch(() => null),
    getCategoriesServer().catch(() => ({ categories: [] })),
    getTagsServer().catch(() => ({ tags: [] })),
  ]);

  const postsLoadError = postsResult === null;
  const categories = ['全部', ...(categoriesData?.categories ?? [])];
  const tags = tagsData?.tags ?? [];
  const currentCategory = category ?? '全部';
  const currentTag = tag ?? null;

  if (
    !postsLoadError &&
    postsResult &&
    page > postsResult.totalPages &&
    postsResult.totalPages > 0
  ) {
    const correctedParams = new URLSearchParams();
    for (const [k, v] of Object.entries(baseParams)) {
      if (v && k !== 'page') correctedParams.set(k, v);
    }
    correctedParams.set('page', String(postsResult.totalPages));
    redirect(`/posts?${correctedParams.toString()}`);
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
      <PageHeader
        title="全部文章"
        subtitle="浏览所有已发布内容，按分类或标签筛选你感兴趣的话题。"
      />

      {/* 侧边栏（分类/标签筛选）与列表主体 */}
      <Suspense fallback={<div className="w-65 animate-pulse" />}>
        <PostSidebar
          categories={categories}
          tags={tags}
          currentCategory={currentCategory}
          currentTag={currentTag}
          zeroResults={posts.length === 0}
        >
          <div className="anim-fade-up stagger-2 mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-body text-(length:--type-sm) leading-normal font-medium">
              共 {total} 篇{totalPages > 1 ? ` · 第 ${currentPage}/${totalPages} 页` : ''}
            </p>
            <div className="row-md flex-wrap">
              <PostsSearchInput initialValue={q ?? ''} />
            </div>
          </div>

          {/* 列表三态：加载失败 / 空结果 / 卡片列表 */}
          {postsLoadError ? (
            <EmptyState
              icon={<Search size={20} />}
              title="文章加载失败"
              description="网络异常或服务暂时不可用，请稍后刷新页面重试"
              action={
                <Button href="/posts" variant="ghost" size="sm">
                  刷新页面
                </Button>
              }
            />
          ) : posts.length === 0 ? (
            <EmptyState
              icon={<Search size={20} />}
              title="没有符合条件的文章"
              description="尝试调整筛选条件或搜索关键词"
              action={
                hasFilters ? (
                  <Button href="/posts" variant="ghost" size="sm">
                    清除筛选
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="card-list">
              {posts.map((p, i) => (
                <ArticleCard
                  key={p.id}
                  post={p}
                  href={`/posts/${p.id}`}
                  index={i}
                  tags={p.tags}
                  badge={p.pinned ? <PinnedBadge /> : undefined}
                />
              ))}
            </div>
          )}

          {/* 分页导航，仅超过一页时渲染 */}
          {totalPages > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-2" aria-label="分页导航">
              {currentPage === 1 ? (
                <span className="page-btn pointer-events-none w-9 opacity-40" aria-label="上一页">
                  <ChevronLeft size={16} />
                </span>
              ) : (
                <Link
                  href={buildPostsUrl(baseParams, { page: String(Math.max(1, currentPage - 1)) })}
                  className="page-btn w-9"
                  aria-label="上一页"
                >
                  <ChevronLeft size={16} />
                </Link>
              )}
              {pageNumbers.map((n) => (
                <Link
                  key={n}
                  href={buildPostsUrl(baseParams, { page: String(n) })}
                  aria-current={n === currentPage ? 'page' : undefined}
                  aria-label={`第 ${n} 页`}
                  className={`page-btn min-w-9 px-2.5 text-(length:--type-sm) ${
                    n === currentPage
                      ? 'page-btn-active'
                      : ''
                  }`}
                >
                  {n}
                </Link>
              ))}
              {currentPage === totalPages ? (
                <span className="page-btn pointer-events-none w-9 opacity-40" aria-label="下一页">
                  <ChevronRight size={16} />
                </span>
              ) : (
                <Link
                  href={buildPostsUrl(baseParams, {
                    page: String(Math.min(totalPages, currentPage + 1)),
                  })}
                  className="page-btn w-9"
                  aria-label="下一页"
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
