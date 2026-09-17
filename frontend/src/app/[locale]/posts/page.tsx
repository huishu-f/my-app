/**
 * @file page.tsx
 * @description 文章列表页（/posts RSC）：按分类/标签/关键词与分页拉取文章，渲染筛选侧栏、空态/加载失败态与页码导航；对越界页码做重定向纠正
 */
import type { Metadata } from 'next';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { ArticleCard } from '@/components/ArticleCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { PinnedBadge } from '@/components/ui/PinnedBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { listPostsServer, getCategoriesServer, getTagsServer } from '@/services/blog/server';
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
 * 列表页 SEO 元数据
 * @returns 拼接站点标题的 title 与取副标的 description
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('posts');
  const tMeta = await getTranslations('meta');
  return {
    title: `${t('title')} · ${tMeta('siteTitle')}`,
    description: t('subtitle'),
  };
}

/** ISR 再验证周期，单位：秒。新鲜度由数据层 unstable_cache 的 posts 标签失效接管，周期仅作兜底 */
export const revalidate = 3600;

/**
 * 文章列表页主体
 * @param props params.locale 路由语言；searchParams 承载 category/tag/page/q 等筛选与分页查询参数
 * @returns 列表页 RSC 渲染树；locale 非法时触发 notFound，页码越界时 redirect 到最后一页
 */
export default async function PostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // 校验 URL 语言在受支持列表内否则 404；设定请求级 locale 供 next-intl 服务端取对应文案
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations('posts');
  const tCommon = await getTranslations('common');
  const sp = await searchParams;

  // 归一化查询参数：searchParams 值可能为 string | string[] | undefined，仅接受字符串，否则视为未选
  const category = typeof sp.category === 'string' ? sp.category : undefined;

  const tag = typeof sp.tag === 'string' ? sp.tag : undefined;

  // Number 对 ''/NaN/0 均判为假值，|| 1 兜底保证页码从 1 起
  const page = Number(sp.page) || 1;

  const q = typeof sp.q === 'string' ? sp.q : undefined;

  // 复用给分页链接的基础查询参数；page>1 才带上，避免首页 URL 冗余 ?page=1
  const baseParams: Record<string, string | undefined> = {
    category,
    tag,
    q,
    page: page > 1 ? String(page) : undefined,
  };

  // 并发拉取列表/分类/标签，各请求单独 catch 兜底：列表失败留 null 标记，分类/标签回退空，任一接口异常不整页崩溃
  const [postsResult, categoriesData, tagsData] = await Promise.all([
    listPostsServer({
      // ALL_CATEGORY 是前端"全部"哨兵值，不作为真实分类传给后端过滤
      category: category !== ALL_CATEGORY ? category : undefined,
      tag: tag ?? undefined,
      q: q?.trim() || undefined,
      page,
      limit: PAGE_SIZE,
    }).catch(() => null),
    getCategoriesServer().catch(() => ({ categories: [] })),
    getTagsServer().catch(() => ({ tags: [] })),
  ]);

  // 列表请求失败被 catch 成 null，据此区分"加载失败"与"结果为空"两种空态
  const postsLoadError = postsResult === null;

  // 在真实分类前预置"全部"选项，作为列表页默认筛选项
  const categories = [ALL_CATEGORY, ...(categoriesData?.categories ?? [])];

  const tags = tagsData?.tags ?? [];

  const currentCategory = category ?? ALL_CATEGORY;

  const currentTag = tag ?? null;

  // 页码越界（超出总页数且确有数据）时纠正到最后一页并 302，避免展示空白页；仅在列表加载成功时执行
  if (
    !postsLoadError &&
    postsResult &&
    page > postsResult.totalPages &&
    postsResult.totalPages > 0
  ) {
    // 保留除 page 外的有效筛选参数，再强制指向最后一页
    const correctedParams = new URLSearchParams();
    for (const [k, v] of Object.entries(baseParams)) {
      if (v && k !== 'page') correctedParams.set(k, v);
    }
    correctedParams.set('page', String(postsResult.totalPages));
    redirect({ href: `/posts?${correctedParams.toString()}`, locale });
  }

  // 统一兜底解构：加载失败/无数据时给空数组与零值，渲染层无需再逐处判空
  const posts = postsResult?.posts ?? [];

  const total = postsResult?.total ?? 0;

  const totalPages = Math.max(1, postsResult?.totalPages ?? 1);

  const rawPage = postsResult?.page ?? page;

  // 双重夹取到 [1, totalPages]，防止手改 URL 导致当前页越界
  const currentPage = Math.min(Math.max(1, rawPage), totalPages);

  const hasFilters = !!(q?.trim() || category || tag);

  // 页码导航滑动窗口：最多展示 5 个页码，围绕当前页居中并夹紧到 [1, totalPages]
  const maxPages = Math.min(5, totalPages);

  let pageStart = Math.max(1, currentPage - 2);

  const pageEnd = Math.min(totalPages, pageStart + maxPages - 1);

  pageStart = Math.max(1, pageEnd - maxPages + 1);

  // 先生成 [pageStart, pageEnd] 连续页码；pageEnd 回推 pageStart 保证靠近首/尾页时窗口不越界
  const pageNumbers = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i);

  return (
    <Container className="page-section">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {/* PostSidebar 内部用了 useSearchParams，须包 Suspense 边界，否则整页会因客户端 hook 降级为动态渲染 */}
      <Suspense fallback={<div className="w-65 animate-pulse" />}>
        <PostSidebar
          categories={categories}
          tags={tags}
          currentCategory={currentCategory}
          currentTag={currentTag}
          zeroResults={posts.length === 0}
        >
          {/* 结果计数与搜索框的两端对齐工具条：用 page-actions 表达（与 PageHeader 的 actions 同一套对齐规则） */}
          <div className="page-actions animate-fade-in mb-6">
            <p className="text-body text-(length:--type-xs) leading-normal font-medium">
              {totalPages > 1
                ? t('totalWithPage', { count: total, current: currentPage, total: totalPages })
                : t('totalOnly', { count: total })}
            </p>
            <div className="row-md flex-wrap">
              <PostsSearchInput initialValue={q ?? ''} />
            </div>
          </div>

          {postsLoadError ? (
            <div className="animate-fade-in">
              <EmptyState
                icon={<Search size={20} strokeWidth={2.5} />}
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
                icon={<Search size={20} strokeWidth={2.5} />}
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

          {totalPages > 1 && (
            <nav
              className="mt-12 flex items-center justify-center gap-2"
              aria-label={t('pagination')}
            >
              {currentPage === 1 ? (
                <span
                  className="page-btn pointer-events-none w-9 opacity-40"
                  aria-label={t('prevPage')}
                >
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
                  className={`page-btn min-w-9 px-2.5 text-(length:--type-xs) ${
                    n === currentPage ? 'page-btn-active' : ''
                  }`}
                >
                  {n}
                </Link>
              ))}
              {currentPage === totalPages ? (
                <span
                  className="page-btn pointer-events-none w-9 opacity-40"
                  aria-label={t('nextPage')}
                >
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
