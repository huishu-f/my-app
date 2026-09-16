/**
 * @file page.tsx
 * @description 文章详情页，展示文章正文、目录、操作栏与评论区，作者可编辑删除
 */
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import '@/app/styles/hljs-theme.css';
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate, getInitials, splitName } from '@/lib/format';
import { CATEGORY_LABEL_KEYS, isKnownCategory } from '@/lib/category';
import type { Locale } from '@/i18n/config';
import { estimateReadingTime, stripHtml, stripMarkdown } from '@/lib/markdown';
import { isSafeImageUrl } from '@/lib/validators';
import { tagClassFor, tagVariantFor } from '@/components/ui/Tag';
import {
  getPublicPostServer,
  getPostServer,
  getNeighborPostsServer,
  listPostsServer,
} from '@/services/blog/server';
import { getCurrentUser } from '@/services/auth/server';
import { NotFoundError } from '@server/errors';
import { SITE_URL } from '@/config/site';
import { routing } from '@/i18n/routing';
import type { Post, User } from '@my-app/shared';
import { PostActions } from './_components/PostActions';
import { PostHeadStats } from './_components/PostHeadStats';
import { PostToc } from './_components/PostToc';
import { AuthorActions } from './_components/AuthorActions';
import { ViewReporter } from './_components/ViewReporter';
import { LazyComments, LazyBackToTop } from './_components/LazyIslands';
import { PostStateProvider } from './_components/PostStateProvider';
import { BackLink } from './_components/BackLink';

/**
 * ISR 缓存策略：快路径（已发布文章）渲染无动态 API → 按需静态生成（60s）；
 * 慢路径（草稿预览）触碰 cookies() → 动态渲染，不进 Full Route Cache，草稿不会泄入静态缓存。
 * 写操作通过 revalidateTag('posts' / 'post:id') 即时失效，无需等 60s 窗口。
 */
export const revalidate = 60;

/**
 * 构建时预生成已发布文章的静态页面（首屏前 100 篇）。
 * 运行时新发布的文章走 on-demand ISR，首访生成后进入 Full Route Cache。
 */
export async function generateStaticParams() {
  try {
    const data = await listPostsServer({ page: 1, limit: 100 });
    return data.posts.flatMap((p) =>
      routing.locales.map((locale) => ({
        locale,
        id: encodeURIComponent(p.id),
      })),
    );
  } catch {
    return [];
  }
}

/**
 * 解码动态段 id — Next.js 15+ 的 params 动态段保持 URI 编码（文章 id 含中文）。
 * 数据获取与客户端请求必须使用与 API 返回一致的原始 id（未编码），
 * 保证服务端渲染、客户端岛屿与路由跳转引用同一标识。
 * 容错畸形编码（decodeURIComponent 可能抛错），畸形输入最终由 404 兑底。
 * @param rawId 动态段传入的 URI 编码文章 id
 * @returns 解码后的原始文章 id
 */
function decodeId(rawId: string): string {
  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
}

/**
 * 生成文章详情页 SEO metadata，SSR 获取文章数据，返回 title/description/openGraph/twitter
 * @param params 路由动态参数，含文章 id
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id: rawId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const id = decodeId(rawId);
  const tMeta = await getTranslations('meta');
  const tPost = await getTranslations('post');
  try {
    const data = await getPublicPostServer(id);
    const post = data.post;
    const cleanTitle = stripMarkdown(post.title);
    const description = stripHtml(post.summary || post.content).slice(0, 160);
    return {
      title: `${cleanTitle} · ${tMeta('siteTitle')}`,
      description,
      alternates: { canonical: `/posts/${id}` },
      openGraph: {
        title: cleanTitle,
        description,
        type: 'article',
        ...(post.coverImage && { images: [{ url: post.coverImage, width: 1200, height: 630 }] }),
      },
      twitter: {
        card: 'summary_large_image',
        title: cleanTitle,
        description,
        ...(post.coverImage && { images: [post.coverImage] }),
      },
    };
  } catch {
    return { title: `${tPost('notFoundTitle')} · ${tMeta('siteTitle')}` };
  }
}

/**
 * NeighborPosts 相邻文章导航 — 异步 Server Component，用 Suspense 包裹实现流式渲染
 * @param id 文章 id，用于获取相邻文章
 */
async function NeighborPosts({ id }: { id: string }) {
  const tPost = await getTranslations('post');
  const neighborPosts = await getNeighborPostsServer(id).catch(() => null);
  const prevPost = neighborPosts?.prev ?? null;
  const nextPost = neighborPosts?.next ?? null;

  if (!prevPost && !nextPost) return null;

  return (
    <nav className="mt-10 mb-8 grid gap-4 sm:grid-cols-2">
      {prevPost ? (
        <Link
          href={`/posts/${prevPost.id}`}
          className="card card-hover group flex flex-col gap-1 p-4"
        >
          <span className="text-faint flex items-center gap-1 text-(length:--type-xs) font-medium">
            <ChevronLeft size={14} strokeWidth={2.5} />
            {tPost('prevPost')}
          </span>
          <span className="text-heading group-hover:text-accent line-clamp-2 text-(length:--type-base) font-semibold transition-colors duration-150">
            {stripMarkdown(prevPost.title)}
          </span>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}
      {nextPost ? (
        <Link
          href={`/posts/${nextPost.id}`}
          className="card card-hover group flex flex-col gap-1 p-4 text-right"
        >
          <span className="text-faint flex items-center justify-end gap-1 text-(length:--type-xs) font-medium">
            {tPost('nextPost')}
            <ChevronRight size={14} strokeWidth={2.5} />
          </span>
          <span className="text-heading group-hover:text-accent line-clamp-2 text-(length:--type-base) font-semibold transition-colors duration-150">
            {stripMarkdown(nextPost.title)}
          </span>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}
    </nav>
  );
}

/**
 * PostDetailPage 文章详情页，两路径渲染：
 * - 快路径（已发布文章，99% 流量）：公开详情 fetch（skipAuth + Data Cache 60s + 双标签），
 *   渲染不触碰动态 API → 可被 ISR 静态缓存，TTFB 不再穿透 API + KV；
 * - 慢路径（草稿预览/不存在）：公开视角 404 后才读取登录态做作者级兑底，
 *   该次渲染动态化，草稿不会泄入静态缓存。
 * 展示态（点赞/收藏/评论计数）由 PostStateProvider 状态提升，交互后本地更新，零额外请求。
 * @param params 路由动态参数，含文章 id
 */
export default async function PostDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  /** locale 验证 + setRequestLocale（启用静态渲染） */
  const { locale, id: rawId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const id = decodeId(rawId);

  /** 快路径：公开文章详情，草稿对公开视角 404 */
  let post: Post | null = null;
  /** 当前用户：慢路径（草稿预览）时填充；快路径恒为 null，作者 UI 由客户端岛屿 useAuth 判定 */
  let user: User | null = null;

  try {
    const publicData = await getPublicPostServer(id);
    post = publicData.post;
  } catch (err) {
    /** 慢路径：公开视角 404 时才读取登录态做作者级兜底，真 404 与网络异常分离 */
    if (err instanceof NotFoundError) {
      user = await getCurrentUser();
      if (user) {
        try {
          const authData = await getPostServer(id);
          post = authData.post;
        } catch (authErr) {
          if (!(authErr instanceof NotFoundError)) throw authErr;
        }
      }
      if (!post) {
        notFound();
      }
    } else {
      /** 构建时 KV 读取可能因网络波动失败（InternalServerError），不应阻断构建。
       *  兜底为 notFound()，运行时 ISR 会按需重新生成。 */
      notFound();
    }
  }

  /** 作者头像首字母缩写 */
  const t = await getTranslations('post');
  const tNav = await getTranslations('nav');
  const tCommon = await getTranslations('common');
  const { firstName, lastName } = splitName(post.authorName || '');
  const authorInitials = post.authorName ? getInitials(firstName, lastName) : '';
  /** 分类展示名（数据值保持中文原值，仅展示层翻译；未知值原样显示） */
  const categoryLabel = isKnownCategory(post.category)
    ? tCommon(CATEGORY_LABEL_KEYS[post.category])
    : post.category;

  return (
    <PostStateProvider initialPost={post}>
      <Container className="page-section">
        <div className="grid grid-cols-1 gap-10 pb-12 max-lg:gap-0 max-lg:pb-8 lg:grid-cols-[1fr_220px]">
          {/* 主列（文章正文区） */}
          <article>
            {/* 返回列表导航 */}
            <BackLink />

            {/* 文章头部 */}
            <header className="article-head animate-fade-in mb-10">
              <div className="row-sm mb-5">
                <span className="chip">{categoryLabel}</span>
              </div>

              <h1 className="article-title display-serif text-heading mt-0 text-(length:--type-5xl) leading-tight font-bold tracking-[-0.025em] max-md:text-(length:--type-4xl) text-balance">
                {stripMarkdown(post.title)}
              </h1>

              <p className="article-summary text-body mt-5 text-(length:--type-md) leading-normal max-md:text-(length:--type-base)">
                {stripHtml(post.summary)}
              </p>

              <div className="article-meta row-lg border-stroke mt-8 flex-wrap border-t pt-6">
                <div className="author-info flex items-center gap-3 max-md:gap-2.5">
                  <Avatar initials={authorInitials} size="lg" />
                  <div className="author-detail flex flex-col gap-1">
                    <span className="author-name text-heading text-(length:--type-base) leading-normal font-semibold">
                      {post.authorName}
                    </span>
                    <span className="author-sub meta-text">
                      {formatDate(post.publishedAt || post.createdAt, locale)} · {' '}
                      {t('readingTime', { minutes: estimateReadingTime(post.content) })}
                    </span>
                  </div>
                </div>
                <div className="meta-stats row-md text-muted ml-auto text-(length:--type-sm) leading-normal">
                  {/* 头部统计：客户端组件，点赞/收藏/评论交互后与操作栏计数同步（BUG-01 修复） */}
                  <PostHeadStats />
                </div>
              </div>

              {/* 作者操作按钮 — 客户端岛屿判定（公开内容静态化后 SSR 无登录态） */}
              <AuthorActions postId={post.id} authorId={post.authorId} ssrUser={user} />
            </header>

            {/* 封面图 */}
            {post.coverImage && isSafeImageUrl(post.coverImage) ? (
              <Image
                src={post.coverImage}
                alt={post.title}
                width={1200}
                height={514}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 1200px, 1200px"
                priority
                referrerPolicy="no-referrer"
                className="article-cover animate-fade-in mb-10 aspect-[21/9] w-full rounded-2xl object-cover max-md:aspect-[16/9]"
              />
            ) : (
              <div className="article-cover-fallback cover-fallback animate-fade-in mb-10 flex aspect-[21/9] w-full items-center justify-center rounded-2xl max-md:aspect-[16/9]">
                <ImageIcon size={48} strokeWidth={1.5} className="text-muted" />
              </div>
            )}

            {/* 文章正文 */}
            <div id="article-content" className="article-content-wrapper animate-fade-in">
              <div className="article-content" dangerouslySetInnerHTML={{ __html: post.content }} />

              {/* 文章标签 */}
              {post.tags?.length > 0 && (
                <div className="article-tags border-stroke mt-10 flex flex-wrap gap-2 border-t pt-8">
                  {post.tags.map((t) => (
                    <Link
                      key={t}
                      href={`/posts?tag=${encodeURIComponent(t)}`}
                      className={`badge-lg ${tagClassFor[tagVariantFor(t)]}`}
                    >
                      {t}
                    </Link>
                  ))}
                </div>
              )}

              {/* 操作栏 — 客户端岛屿 */}
              <PostActions user={user} />

              {/* 浏览量上报 — fire-and-forget，与静态缓存解耦 */}
              <ViewReporter postId={post.id} />

              {/* 评论区 — 客户端岛屿 */}
              <LazyComments postId={post.id} user={user} postAuthorId={post.authorId} />
            </div>

            {/* 上一篇 / 下一篇导航 — Suspense 流式加载，不阻塞文章正文 */}
            <Suspense
              fallback={<div className="bg-surface mt-10 mb-8 h-20 animate-pulse rounded-xl" />}
            >
              <NeighborPosts id={id} />
            </Suspense>
          </article>

          {/* 目录侧边栏 — 客户端岛屿，读取 DOM 中的 #article-content */}
          <PostToc articleId="article-content" />
        </div>

        {/* 返回顶部 */}
        <LazyBackToTop />

        {/* JSON-LD 结构化数据 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: stripMarkdown(post.title),
              description: stripHtml(post.summary),
              datePublished: post.publishedAt || post.createdAt,
              dateModified: post.updatedAt || post.publishedAt || post.createdAt,
              author: {
                '@type': 'Person',
                name: post.authorName,
              },
              ...(post.coverImage ? { image: post.coverImage } : {}),
            }).replace(/</g, '\\u003c'),
          }}
        />

        {/* BreadcrumbList 结构化数据 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: tNav('home'), item: `${SITE_URL}/${locale}` },
                { '@type': 'ListItem', position: 2, name: tNav('posts'), item: `${SITE_URL}/${locale}/posts` },
                { '@type': 'ListItem', position: 3, name: stripMarkdown(post.title) },
              ],
            }).replace(/</g, '\\u003c'),
          }}
        />
      </Container>
    </PostStateProvider>
  );
}
