/**
 * @file page.tsx
 * @description 文章列表页：服务端渲染文章卡片列表，
 *              支持分类/标签筛选、关键词搜索与分页，页码越界时自动重定向到末页。
 */
import type { Metadata } from 'next';
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
import { ALL_CATEGORY } from '@/lib/category';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { Link, redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { PostSidebar } from './_components/PostSidebar';
import { PostsSearchInput } from './_components/PostsSearchInput';
import { buildPostsUrl } from './_lib/buildPostsUrl';

/**
 * 生成文章列表页 SEO 元数据（标题/描述），文案随语言切换
 * @returns Next.js Metadata 对象
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('posts');
  const tMeta = await getTranslations('meta');
  return {
    title: `${t('title')} · ${tMeta('siteTitle')}`,
    description: t('subtitle'),
  };
}

/** 列表页 ISR 重新验证间隔（秒） */
export const revalidate = 60;

/**
 * PostsPage 文章列表页组件
 * 并行拉取文章/分类/标签数据，渲染侧边栏筛选 + 列表三态 + 分页导航
 * @param params.params 路由动态参数，含 locale
 * @param searchParams 路由查询参数（分类/标签/关键词/页码）
 */
export default async function PostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  /** 解析并校验 locale，写入请求级存储以启用静态渲染 */
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  /** 列表页与通用文案翻译函数 */
  const t = await getTranslations('posts');
  const tCommon = await getTranslations('common');
  const sp = await searchParams;

  /** 当前筛选分类（URL 参数） */
  const category = typeof sp.category === 'string' ? sp.category : undefined;
  /** 当前筛选标签（URL 参数） */
  const tag = typeof sp.tag === 'string' ? sp.tag : undefined;
  /** 当前页码，非法值兜底为 1 */
  const page = Number(sp.page) || 1;
  /** 搜索关键词（URL 参数） */
  const q = typeof sp.q === 'string' ? sp.q : undefined;

  /** 当前 URL 的筛选基础参数（page=1 时省略 page 参数），供分页链接复用 */
  const baseParams: Record<string, string | undefined> = {
    category,
    tag,
    q,
    page: page > 1 ? String(page) : undefined,
  };

  /** 并行拉取文章列表/分类/标签，各自容错：文章失败→null（错误态），分类/标签失败→空数组 */
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

  /** 文章列表接口是否加载失败（null 即失败，与空数据区分） */
  const postsLoadError = postsResult === null;
  /** 分类列表：首位固定拼接“全部”哨兵值（跨语言一致的 URL 数据层标识，展示层由 PostSidebar 翻译） */
  const categories = [ALL_CATEGORY, ...(categoriesData?.categories ?? [])];
  /** 标签列表（接口失败兜底空数组） */
  const tags = tagsData?.tags ?? [];
  /** 当前选中分类，缺省为“全部” */
  const currentCategory = category ?? ALL_CATEGORY;
  /** 当前选中标签，未选为 null */
  const currentTag = tag ?? null;

  /** 页码越界：剔除旧 page 后重定向到末页，保留其余筛选参数 */
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
    redirect({ href: `/posts?${correctedParams.toString()}`, locale });
  }

  /** 当前页文章数组 */
  const posts = postsResult?.posts ?? [];
  /** 文章总数 */
  const total = postsResult?.total ?? 0;
  /** 总页数（至少 1，供分页边界计算） */
  const totalPages = Math.max(1, postsResult?.totalPages ?? 1);
  /** 接口返回的页码（无接口结果时用 URL 页码） */
  const rawPage = postsResult?.page ?? page;
  /** 当前页码，夹取到 [1, totalPages] */
  const currentPage = Math.min(Math.max(1, rawPage), totalPages);
  /** 是否存在任何筛选条件（空态区分“无结果”与“被筛选清空”） */
  const hasFilters = !!(q?.trim() || category || tag);

  /** 分页窗口最多展示 5 个页码 */
  const maxPages = Math.min(5, totalPages);
  /** 窗口起始页码，以当前页为中心，先按左侧扩展 */
  let pageStart = Math.max(1, currentPage - 2);
  /** 窗口结束页码，不超过总页数 */
  const pageEnd = Math.min(totalPages, pageStart + maxPages - 1);
  /** 右侧被截断时回推起始页，保证窗口尽量占满 */
  pageStart = Math.max(1, pageEnd - maxPages + 1);
  /** 最终渲染的页码数组 */
  const pageNumbers = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i);

  return (
    <Container className="page-section">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
      />

      {/* 侧边栏（分类/标签筛选）与列表主体，Suspense 兜底侧栏骨架 */}
      <Suspense fallback={<div className="w-65 animate-pulse" />}>
        <PostSidebar
          categories={categories}
          tags={tags}
          currentCategory={currentCategory}
          currentTag={currentTag}
          zeroResults={posts.length === 0}
        >
          {/* 统计信息 + 搜索输入栏 */}
          <div className="animate-fade-in mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-body text-(length:--type-sm) leading-normal font-medium">
              {totalPages > 1
                ? t('totalWithPage', { count: total, current: currentPage, total: totalPages })
                : t('totalOnly', { count: total })}
            </p>
            <div className="row-md flex-wrap">
              <PostsSearchInput initialValue={q ?? ''} />
            </div>
          </div>

          {/* 列表三态：加载失败 / 空结果 / 卡片列表 — 共享同一入场节奏（） */}
          {postsLoadError ? (
            <div className="animate-fade-in">
              <EmptyState
                icon={<Search size={20} />}
                title={t('loadErrorTitle')}
                description={t('loadErrorDesc')}
                action={
                  <Button href="/posts" variant="ghost">
                    {tCommon('refresh')}
                  </Button>
                }
              />
            </div>
          ) : posts.length === 0 ? (
            <div className="animate-fade-in">
              <EmptyState
                icon={<Search size={20} />}
                title={t('noResultsTitle')}
                description={t('noResultsDesc')}
                action={
                  hasFilters ? (
                    <Button href="/posts" variant="ghost">
                      {t('clearFilters')}
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="card-list animate-fade-in">
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

          {/* 分页导航：仅超过一页时渲染，含上一页/页码窗口/下一页 */}
          {totalPages > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-2" aria-label={t('pagination')}>
              {currentPage === 1 ? (
                <span className="page-btn pointer-events-none w-9 opacity-40" aria-label={t('prevPage')}>
                  <ChevronLeft size={16} />
                </span>
              ) : (
                <Link
                  href={buildPostsUrl(baseParams, { page: String(Math.max(1, currentPage - 1)) })}
                  className="page-btn w-9"
                  aria-label={t('prevPage')}
                >
                  <ChevronLeft size={16} />
                </Link>
              )}
              {pageNumbers.map((n) => (
                <Link
                  key={n}
                  href={buildPostsUrl(baseParams, { page: String(n) })}
                  aria-current={n === currentPage ? 'page' : undefined}
                  aria-label={t('pageN', { n })}
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
                <span className="page-btn pointer-events-none w-9 opacity-40" aria-label={t('nextPage')}>
                  <ChevronRight size={16} />
                </span>
              ) : (
                <Link
                  href={buildPostsUrl(baseParams, {
                    page: String(Math.min(totalPages, currentPage + 1)),
                  })}
                  className="page-btn w-9"
                  aria-label={t('nextPage')}
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
