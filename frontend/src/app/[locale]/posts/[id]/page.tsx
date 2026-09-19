/**
 * @file page.tsx
 * @description 文章详情页（/posts/[id] RSC）：渲染正文、作者/标签/上下篇/评论等，含 SEO 元数据、JSON-LD 结构化数据、构建期预渲染参数与"公开→鉴权"取数降级
 */
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { Suspense } from 'react';
import { Metadata } from 'next';
import '@/styles/hljs-theme.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Container } from '@/ui/Container';
import { Avatar } from '@/ui/Avatar';
import { formatDate, getInitials, splitName } from '@/lib/format';
import { getCategoryLabel } from '@/lib/category';
import { estimateReadingTime, stripHtml, stripMarkdown } from '@my-app/shared/lib/markdown';
import { isSafeImageUrl } from '@my-app/shared/lib/validators';
import { tagClassFor, tagVariantFor } from '@/ui/Tag';
import { getPublicPostServer, getNeighborPostsServer, listPostsServer } from '@/services/blog/load';
import { isAppErrorWithStatus } from '@my-app/backend/errors';
import { SITE_URL } from '@/config/site';
import { routing } from '@/i18n/routing';
import { resolveLocaleParams } from '@/i18n/locale-params';
import { Post, User } from '@my-app/shared';
import { PostActions } from '@/features/posts/components/PostActions';
import { PostHeadStats } from '@/features/posts/components/PostHeadStats';
import { PostToc } from '@/features/posts/components/PostToc';
import { AuthorActions } from '@/features/posts/components/AuthorActions';
import { ViewReporter } from '@/features/posts/components/ViewReporter';
import { LazyComments } from '@/features/comments/components/LazyComments';
import { LazyBackToTop } from '@/ui/LazyBackToTop';
import { PostStateProvider } from '@/features/posts/components/PostStateProvider';
import { BackLink } from '@/features/posts/components/BackLink';

/** ISR 再验证周期，单位：秒。新鲜度由数据层 unstable_cache 的 posts 标签失效接管，周期仅作兜底 */
export const revalidate = 3600;

/**
 * 构建期预渲染：为最近若干篇文章 × 各受支持语言生成静态路由参数
 * @returns { locale, id } 参数列表；接口异常时返回空数组，降级为运行时按需渲染
 */
export async function generateStaticParams() {
  try {
    // 构建期只预热最新 100 篇，避免全量拉取拖慢构建
    const data = await listPostsServer({ page: 1, limit: 100 });
    // 每篇文章为所有语言各生成一份参数；id 在此 encodeURIComponent，渲染时经 decodeId 还原
    return data.posts.flatMap((p) =>
      routing.locales.map((locale) => ({
        locale,
        id: encodeURIComponent(p.id),
      })),
    );
  } catch {
    // 构建期取数失败不阻断构建，转为运行时按需渲染
    return [];
  }
}

/**
 * 还原可能被 URL 编码的路由文章 id
 * @param rawId params.id 原始值
 * @returns 解码后的 id；遇非法编码时原样返回，避免抛异常
 */
function decodeId(rawId: string): string {
  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
}

/**
 * 解析「当前访问者可见的」文章，即公开可见（已发布）的文章。
 *
 * 本函数**只走公开接口**，绝不触碰 cookies()/headers() 这类动态 API，原因：
 * 本页是静态生成（generateStaticParams + revalidate），未预渲染的 id 会在运行期按需渲染。
 * 静态渲染期间调用 cookies() 会被 Next 判定为「静态页在运行期变为动态」
 * （Page changed from static to dynamic, reason: headers）并直接 500——
 * 本地的 dev 全动态不会暴露，只在生产构建出现，于是「不存在的文章」返回 500 而非 404。
 *
 * 原实现的「公开 → 鉴权」两级降级（作者读自己的未发布草稿）已移除：草稿在应用内
 * 一律通过 /write?id= 进入编辑器（见 ProfileTabs 草稿 tab），不存在指向 /posts/{id}
 * 的草稿入口，该分支在生产环境唯一的效果就是让 404 变成 500。
 * 若将来要支持草稿预览，应另开一个动态路由承载，而不是让本页读 Cookie。
 *
 * @param id 已解码的文章 id
 * @returns post 为公开可见的文章；user 恒为 null（RSC 侧不解析登录态，权限展示由客户端 hook 决定）
 * @throws 文章不可见（404）或其它真异常原样上抛，由调用方决定转 notFound 还是降级
 */
async function resolveVisiblePost(id: string): Promise<{ post: Post; user: User | null }> {
  const data = await getPublicPostServer(id);
  return { post: data.post, user: null };
}

/**
 * 详情页 SEO 元数据
 * @param props params 含 locale 与文章 id
 * @returns 含 OpenGraph/Twitter 卡片的元数据；文章不可见时返回"未找到"标题兜底
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id: rawId } = await resolveLocaleParams(params);
  const id = decodeId(rawId);
  const tMeta = await getTranslations('meta');
  try {
    const { post } = await resolveVisiblePost(id);
    const cleanTitle = stripMarkdown(post.title);
    // 取摘要否则正文，去 HTML 后截断到 160 字符作为 meta description
    const description = stripHtml(post.summary || post.content).slice(0, 160);
    // canonical 必须带 locale 前缀：localePrefix='always' 下无前缀路径会被 302，
    // canonical 指向重定向地址会被搜索引擎丢弃或降权
    return {
      title: `${cleanTitle} · ${tMeta('siteTitle')}`,
      description,
      alternates: {
        canonical: `/${locale}/posts/${rawId}`,
        // hreflang：zh/en 互为翻译页，x-default 指向默认语言，供搜索引擎聚合去重
        languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/posts/${rawId}`])),
      },
      openGraph: {
        title: cleanTitle,
        description,
        type: 'article',
        // 仅在有封面图时才附带 OG/Twitter 分享图，尺寸按 1200×630 分享比例
        ...(post.coverImage && { images: [{ url: post.coverImage, width: 1200, height: 630 }] }),
      },
      twitter: {
        card: 'summary_large_image',
        title: cleanTitle,
        description,
        ...(post.coverImage && { images: [post.coverImage] }),
      },
    };
  } catch (err) {
    // 文章不可见时抛 notFound()，与正文保持同一判定口径，此处抛出的 404 会真正写进 HTTP 状态码。
    // 前提是本段不再有 loading.tsx（段级 loading 会先提交外壳，之后的 notFound 改不动状态码）。
    if (isAppErrorWithStatus(err, 404)) notFound();
    // 其余异常（网络/500）继续上抛，交给 error.tsx 展示可重试错误，而不是误导成「文章不存在」
    throw err;
  }
}

/**
 * 上一篇/下一篇导航（异步子组件，被 Suspense 包裹以独立取数、不阻塞正文渲染）
 * @param props id 当前文章 id，用于查询相邻篇
 * @returns 存在相邻文章时渲染导航，前后皆无时返回 null
 */
async function NeighborPosts({ id }: { id: string }) {
  const tPost = await getTranslations('post');

  // 相邻篇获取失败降级为 null，不影响正文展示
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
          <span className="text-faint flex items-center gap-1 text-(length:--type-2xs) font-medium">
            <ChevronLeft size={14} strokeWidth={2.5} />
            {tPost('prevPost')}
          </span>
          <span className="text-heading group-hover:text-accent line-clamp-2 text-(length:--type-sm) font-semibold transition-colors duration-150">
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
          <span className="text-faint flex items-center justify-end gap-1 text-(length:--type-2xs) font-medium">
            {tPost('nextPost')}
            <ChevronRight size={14} strokeWidth={2.5} />
          </span>
          <span className="text-heading group-hover:text-accent line-clamp-2 text-(length:--type-sm) font-semibold transition-colors duration-150">
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
 * 文章详情页主体
 * @param props params 含 locale 与文章 id
 * @returns 详情页 RSC 渲染树；locale 非法或文章不可见时触发 notFound
 */
export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id: rawId } = await resolveLocaleParams(params);

  const id = decodeId(rawId);

  // 取数降级：公开 → 鉴权，与 generateMetadata 共用 resolveVisiblePost，保证两处结论一致
  let resolved: { post: Post; user: User | null };
  try {
    resolved = await resolveVisiblePost(id);
  } catch (err) {
    // 两条路都 404 → 文章确实不存在，转 404 语义（由 [locale]/not-found.tsx 呈现，保留布局与语言）
    if (isAppErrorWithStatus(err, 404)) notFound();
    // 其余异常（网络/500 等）不吞：上抛给本段的 error.tsx 展示可重试错误，
    // 而不是误导用户的"文章不存在"
    throw err;
  }
  const post = resolved.post;
  const user = resolved.user;

  const t = await getTranslations('post');
  const tNav = await getTranslations('nav');
  const tCommon = await getTranslations('common');

  // 拆分作者姓名，用于生成头像首字母
  const { firstName, lastName } = splitName(post.authorName || '');

  const authorInitials = post.authorName ? getInitials(firstName, lastName) : '';

  // 分类 key 经 common 文案映射为展示名（as 断言放宽 next-intl 的 key 类型约束）
  const categoryLabel = getCategoryLabel(post.category, tCommon as (k: string) => string);

  return (
    <Container className="page-section">
      <div className="grid grid-cols-1 gap-10 pb-12 max-lg:gap-0 max-lg:pb-8 lg:grid-cols-[1fr_220px]">
        <article>
          <PostStateProvider initialPost={post}>
            <BackLink />

            <header className="animate-fade-in mb-10">
              <div className="row-sm mb-5">
                <span className="chip">{categoryLabel}</span>
              </div>

              <h1 className="display-serif text-heading mt-0 text-(length:--type-2xl) leading-tight font-bold tracking-[-0.025em] text-balance max-md:text-(length:--type-xl)">
                {stripMarkdown(post.title)}
              </h1>

              <p className="text-body mt-5 text-(length:--type-base) leading-normal max-md:text-(length:--type-sm)">
                {stripHtml(post.summary)}
              </p>

              <div className="row-lg border-stroke mt-8 flex-wrap border-t pt-6">
                <div className="flex items-center gap-3 max-md:gap-2.5">
                  <Avatar initials={authorInitials} size="lg" />
                  <div className="flex flex-col gap-1">
                    <span className="text-heading text-(length:--type-sm) leading-normal font-semibold">
                      {post.authorName}
                    </span>
                    <span className="meta-text">
                      {formatDate(post.publishedAt || post.createdAt, locale)} ·{' '}
                      {t('readingTime', { minutes: estimateReadingTime(post.content) })}
                    </span>
                  </div>
                </div>
                <PostHeadStats />
              </div>

              <AuthorActions postId={post.id} authorId={post.authorId} ssrUser={user} />
            </header>

            {/* 封面须通过 isSafeImageUrl 白名单校验才渲染，防止注入任意外链 */}
            {post.coverImage && isSafeImageUrl(post.coverImage) && (
              <Image
                src={post.coverImage}
                alt={post.title}
                width={1200}
                height={514}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 1200px, 1200px"
                priority
                referrerPolicy="no-referrer"
                className="animate-fade-in mb-10 aspect-21/9 w-full rounded-2xl object-cover max-md:aspect-16/9"
              />
            )}

            <div id="article-content" className="animate-fade-in">
              {/* 正文为服务端渲染好的 HTML，内容来自受信后台，客户端不做二次转义，由 .article-content 样式排版 */}
              <div className="article-content" dangerouslySetInnerHTML={{ __html: post.content }} />

              {post.tags?.length > 0 && (
                <div className="border-stroke mt-10 flex flex-wrap gap-2 border-t pt-8">
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

              <PostActions user={user} />

              <ViewReporter postId={post.id} />

              <LazyComments postId={post.id} user={user} postAuthorId={post.authorId} />
            </div>

            <Suspense
              fallback={<div className="bg-surface mt-10 mb-8 h-20 animate-pulse rounded-xl" />}
            >
              <NeighborPosts id={id} />
            </Suspense>
          </PostStateProvider>
        </article>

        <PostToc articleId="article-content" />
      </div>

      <LazyBackToTop />

      {/* Article 结构化数据供搜索富摘要；序列化后 replace 转义 < ，防止内容提前闭合 script 标签造成 XSS */}
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

      {/* BreadcrumbList 结构化数据：首页 → 文章列表 → 当前文章 的面包屑 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: tNav('home'),
                item: `${SITE_URL}/${locale}`,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: tNav('posts'),
                item: `${SITE_URL}/${locale}/posts`,
              },
              { '@type': 'ListItem', position: 3, name: stripMarkdown(post.title) },
            ],
          }).replace(/</g, '\\u003c'),
        }}
      />
    </Container>
  );
}
