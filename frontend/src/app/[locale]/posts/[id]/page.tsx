import { Container } from "@/components/ui/Container";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { Suspense } from "react";
import type { Metadata } from "next";
import "@/app/styles/hljs-theme.css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate, getInitials, splitName } from "@/lib/format";
import { getCategoryLabel } from "@/lib/category";
import { estimateReadingTime, stripHtml, stripMarkdown } from "@/lib/markdown";
import { decodePostId, encodePostId, isSafeImageUrl, postPath } from "@my-app/shared";
import {
  getPublicPostServer,
  getNeighborPostsServer,
  listPostsServer,
  findRenamedPostId,
} from "@server/blog/blog.cache";
import { isAppErrorWithStatus } from "@server/common/errors";
import { SITE_URL, STATIC_PARAMS_LIMIT } from "@/config/site";
import { routing } from "@/i18n/routing";
import type { Post } from "@my-app/shared";
import { tagClassFor, tagVariantFor } from "@/components/ui/Tag";
import { PostActions } from "@/components/blog/PostActions";
import { PostHeadStats } from "@/components/blog/PostHeadStats";
import { PostToc } from "@/components/blog/PostToc";
import { AuthorActions } from "@/components/blog/AuthorActions";
import { ViewReporter } from "@/components/blog/ViewReporter";
import { LazyComments, LazyBackToTop } from "@/components/blog/LazyIslands";
import { NeighborPostsSkeleton } from "@/components/skeletons/NeighborPostsSkeleton";
import { PostStateProvider } from "@/components/blog/PostStateProvider";
import { BackLink } from "@/components/blog/BackLink";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const data = await listPostsServer({ page: 1, limit: STATIC_PARAMS_LIMIT });

    return data.posts.flatMap((p) =>
      routing.locales.map((locale) => ({
        locale,
        id: encodePostId(p.id),
      })),
    );
  } catch {
    return [];
  }
}

async function redirectIfRenamed(id: string, locale: string): Promise<void> {
  const newId = await findRenamedPostId(id);
  if (!newId) return;
  permanentRedirect(`/${locale}${postPath(newId)}`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id: rawId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const id = decodePostId(rawId);
  const tMeta = await getTranslations("meta");
  try {
    const { post } = await getPublicPostServer(id);
    const cleanTitle = stripMarkdown(post.title);

    const description = stripHtml(post.summary || post.content).slice(0, 160);

    return {
      title: `${cleanTitle} · ${tMeta("siteTitle")}`,
      description,
      alternates: {
        canonical: `/${locale}${postPath(id)}`,

        languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}${postPath(id)}`])),
      },
      openGraph: {
        title: cleanTitle,
        description,
        type: "article",

        ...(post.coverImage && { images: [{ url: post.coverImage, width: 1200, height: 630 }] }),
      },
      twitter: {
        card: "summary_large_image",
        title: cleanTitle,
        description,
        ...(post.coverImage && { images: [post.coverImage] }),
      },
    };
  } catch (err) {
    if (isAppErrorWithStatus(err, 404)) {
      await redirectIfRenamed(id, locale);
      notFound();
    }

    throw err;
  }
}

async function NeighborPosts({ id }: { id: string }) {
  const tPost = await getTranslations("post");

  const neighborPosts = await getNeighborPostsServer(id).catch(() => null);

  const prevPost = neighborPosts?.prev ?? null;

  const nextPost = neighborPosts?.next ?? null;

  if (!prevPost && !nextPost) return null;

  return (
    <nav className="mt-10 mb-8 grid gap-4 sm:grid-cols-2">
      {prevPost ? (
        <Link
          href={postPath(prevPost.id)}
          className="card card-hover group flex flex-col gap-1 p-4"
        >
          <span className="text-faint flex items-center gap-1 text-(length:--type-2xs) font-medium">
            <ChevronLeft size={14} strokeWidth={2.5} />
            {tPost("prevPost")}
          </span>
          <span className="text-heading group-hover:text-accent line-clamp-2 text-(length:--type-sm) font-semibold transition-colors duration-[var(--duration-fast)]">
            {stripMarkdown(prevPost.title)}
          </span>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}
      {nextPost ? (
        <Link
          href={postPath(nextPost.id)}
          className="card card-hover group flex flex-col gap-1 p-4 text-right max-sm:text-left"
        >
          <span className="text-faint flex items-center justify-end gap-1 text-(length:--type-2xs) font-medium">
            {tPost("nextPost")}
            <ChevronRight size={14} strokeWidth={2.5} />
          </span>
          <span className="text-heading group-hover:text-accent line-clamp-2 text-(length:--type-sm) font-semibold transition-colors duration-[var(--duration-fast)]">
            {stripMarkdown(nextPost.title)}
          </span>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}
    </nav>
  );
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id: rawId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const id = decodePostId(rawId);

  let post: Post;
  try {
    post = (await getPublicPostServer(id)).post;
  } catch (err) {
    if (isAppErrorWithStatus(err, 404)) {
      await redirectIfRenamed(id, locale);
      notFound();
    }

    throw err;
  }

  const [t, tNav, tCommon] = await Promise.all([
    getTranslations("post"),
    getTranslations("nav"),
    getTranslations("common"),
  ]);

  const { firstName, lastName } = splitName(post.authorName || "");

  const authorInitials = post.authorName ? getInitials(firstName, lastName) : "";

  const categoryLabel = getCategoryLabel(post.category, tCommon as (k: string) => string);

  return (
    <PostStateProvider initialPost={post}>
      <Container className="page-section">
        <div className="grid grid-cols-1 gap-10 pb-12 max-lg:gap-0 max-lg:pb-8 lg:grid-cols-[1fr_220px]">
          <article>
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
                  <Avatar size="lg" initials={authorInitials} />
                  <div className="flex flex-col gap-1">
                    <span className="text-heading text-(length:--type-sm) leading-normal font-semibold">
                      {post.authorName}
                    </span>
                    <span className="meta-text">
                      {formatDate(post.publishedAt || post.createdAt, locale)} ·{" "}
                      {t("readingTime", { minutes: estimateReadingTime(post.content) })}
                    </span>
                  </div>
                </div>
                <PostHeadStats />
              </div>

              <AuthorActions postId={post.id} authorId={post.authorId} />
            </header>

            {post.coverImage && isSafeImageUrl(post.coverImage) && (
              <Image
                src={post.coverImage}
                alt={post.title}
                width={1200}
                height={514}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 1200px, 1200px"
                priority
                referrerPolicy="no-referrer"
                unoptimized
                className="animate-fade-in mb-10 aspect-21/9 w-full rounded-2xl object-cover max-md:aspect-16/9"
              />
            )}

            <div id="article-content" className="animate-fade-in">
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

              <PostActions user={null} />

              <ViewReporter postId={post.id} />

              <LazyComments postId={post.id} user={null} postAuthorId={post.authorId} />
            </div>

            <Suspense fallback={<NeighborPostsSkeleton />}>
              <NeighborPosts id={id} />
            </Suspense>
          </article>

          <PostToc articleId="article-content" />
        </div>

        <LazyBackToTop />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: stripMarkdown(post.title),
              description: stripHtml(post.summary),
              datePublished: post.publishedAt || post.createdAt,
              dateModified: post.updatedAt || post.publishedAt || post.createdAt,
              author: {
                "@type": "Person",
                name: post.authorName,
              },
              ...(post.coverImage ? { image: post.coverImage } : {}),
            }).replace(/</g, "\\u003c"),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: tNav("home"),
                  item: `${SITE_URL}/${locale}`,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: tNav("posts"),
                  item: `${SITE_URL}/${locale}/posts`,
                },
                { "@type": "ListItem", position: 3, name: stripMarkdown(post.title) },
              ],
            }).replace(/</g, "\\u003c"),
          }}
        />
      </Container>
    </PostStateProvider>
  );
}
