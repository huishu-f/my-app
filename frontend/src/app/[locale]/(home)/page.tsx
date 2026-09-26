import { Search } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PinnedBadge } from "@/components/ui/PinnedBadge";
import { WriteCta } from "@/components/blog/WriteCta";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { listPostsServer } from "@server/blog/blog.cache";
import { routing } from "@/i18n/routing";
import { postPath } from "@my-app/shared";
import { HOME_PAGE_SIZE } from "@/config/site";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const [t, tMeta] = await Promise.all([getTranslations("home"), getTranslations("meta")]);
  return {
    title: `${t("heroKicker")} · ${tMeta("siteTitle")}`,
    description: t("heroLead"),
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const [t, tCommon] = await Promise.all([getTranslations("home"), getTranslations("common")]);

  const postsData = await listPostsServer({ page: 1, limit: HOME_PAGE_SIZE }).catch(() => null);

  const latestPosts = postsData?.posts ?? [];

  const postsLoadError = postsData === null;

  const hasMore = (postsData?.total ?? 0) > latestPosts.length;

  const hasPosts = latestPosts.length > 0;

  return (
    <>
      <section className="hero-section" aria-label={t("heroSection")}>
        <Container>
          <div className="grid grid-cols-1 items-center gap-(--space-10) max-lg:gap-10 lg:grid-cols-[1fr_480px]">
            <div className="max-w-152 max-lg:max-w-none">
              <div className="animate-fade-in row-sm m-0 mb-8 flex">
                <span
                  className="hero-dot animate-breathing inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                  aria-hidden="true"
                />
                <span className="text-muted text-(length:--type-xs) font-medium tracking-[0.02em]">
                  {t("heroBadge")}
                </span>
              </div>

              <p className="animate-fade-in hero-kicker m-0 mb-3">{t("heroKicker")}</p>
              <h1 className="animate-fade-in m-0 mb-8 text-balance">
                <span className="hero-headline text-heading">{t("heroTitle")}</span>
              </h1>

              <p className="animate-fade-in text-body hero-lead m-0 mb-10">{t("heroLead")}</p>

              <div className="animate-fade-in flex flex-wrap items-center gap-5">
                <Button href="/posts" size="lg">
                  {t("browsePosts")}
                </Button>
                <WriteCta />
              </div>
            </div>

            <div className="hero-code-window animate-fade-in overflow-hidden" aria-hidden="true">
              <div className="hero-titlebar row-sm border-stroke border-b px-5 py-3.5">
                <span className="hero-dot-close h-3 w-3 shrink-0 rounded-full" />
                <span className="hero-dot-minimize h-3 w-3 shrink-0 rounded-full" />
                <span className="hero-dot-maximize h-3 w-3 shrink-0 rounded-full" />
                <span className="text-muted ml-auto font-mono text-(length:--type-2xs) tracking-[0.02em]">
                  middleware/authGuard.ts
                </span>
              </div>

              <pre className="text-body m-0 overflow-x-auto px-6 py-5 font-mono text-(length:--type-xs) leading-loose max-md:px-4 max-md:py-4">
                <code className="bg-none font-[inherit]">
                  <span className="tok-comment">{t("codeComment")}</span>
                  {"\n"}
                  <span className="tok-key">export const</span>{" "}
                  <span className="tok-fn">authGuard</span> <span className="tok-punct">=</span>{" "}
                  <span className="tok-key">async</span> <span className="tok-punct">(</span>
                  {"\n  "}
                  <span className="tok-fn">req</span>
                  <span className="tok-punct">:</span> <span className="tok-type">Request</span>
                  <span className="tok-punct">,</span>
                  {"\n  "}
                  <span className="tok-fn">next</span>
                  <span className="tok-punct">:</span>{" "}
                  <span className="tok-type">NextFunction</span>
                  <span className="tok-punct">,</span>
                  {"\n"}
                  <span className="tok-punct">{") => {"}</span>
                  {"\n  "}
                  <span className="tok-fn">req</span>
                  <span className="tok-punct">.</span>
                  <span className="tok-fn">user</span> <span className="tok-punct">=</span>{" "}
                  <span className="tok-key">await</span> <span className="tok-fn">verifyToken</span>
                  <span className="tok-punct">(</span>
                  <span className="tok-fn">req</span>
                  <span className="tok-punct">.</span>
                  <span className="tok-fn">cookies</span>
                  <span className="tok-punct">.</span>
                  <span className="tok-fn">auth_token</span>
                  <span className="tok-punct">);</span>
                  {"\n  "}
                  <span className="tok-fn">next</span>
                  <span className="tok-punct">();</span>
                  {"\n"}
                  <span className="tok-punct">{"};"}</span>
                </code>
              </pre>
            </div>
          </div>
        </Container>
      </section>

      {postsLoadError ? (
        <section className="page-section animate-fade-in" aria-label={t("latestSection")}>
          <Container>
            <div className="page-header">
              <h2 className="section-title">{t("latestTitle")}</h2>
            </div>

            <EmptyState
              icon={<Search size={20} strokeWidth={2.5} />}
              title={t("loadErrorTitle")}
              description={t("loadErrorDesc")}
              action={
                <Button onClick={() => window.location.reload()}>{tCommon("refresh")}</Button>
              }
            />
          </Container>
        </section>
      ) : (
        hasPosts && (
          <section className="page-section animate-fade-in" aria-label={t("latestSection")}>
            <Container>
              <div className="page-header flex items-end justify-between gap-4">
                <div>
                  <h2 className="section-title">{t("latestTitle")}</h2>
                  <p className="text-muted mt-2 text-(length:--type-xs) leading-normal">
                    {t("latestSubtitle")}
                  </p>
                </div>
                <Button href="/posts" variant="ghost" size="sm">
                  {hasMore ? t("viewAllCount", { count: postsData?.total ?? "" }) : t("viewAll")}
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {latestPosts.map((p) => (
                  <ArticleCard
                    key={p.id}
                    post={p}
                    href={postPath(p.id)}
                    tags={p.tags}
                    badge={p.pinned ? <PinnedBadge /> : undefined}
                    variant="vertical"
                  />
                ))}
              </div>
            </Container>
          </section>
        )
      )}
    </>
  );
}
