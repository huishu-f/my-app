/**
 * @file page.tsx
 * @description 首页：Hero 品牌宣传区（标语、CTA、Mac 代码窗口装饰）+ 最新文章列表区，
 *              纯静态 ISR 渲染（不触碰 cookies/headers），列表数据走 Data Cache。
 */
import { Search } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { ArticleCard } from '@/components/ArticleCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PinnedBadge } from '@/components/ui/PinnedBadge';
import { WriteCta } from '@/components/WriteCta';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { listPostsServer } from '@/services/blog/server';
import { routing } from '@/i18n/routing';

/** ISR 重新验证间隔（秒）：构建时预渲染 + 60s 重验证，写操作 revalidateTag('posts') 即时失效 */
export const revalidate = 60;

/**
 * HomePage 首页组件
 * Hero 宣传区 + 最新文章区；"开始写作" CTA 指向注册页，登录态个性化跳转由客户端 AuthProvider 接管
 * @param params.params 路由动态参数，含 locale
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  /** 解析并校验 locale，写入请求级存储以启用静态渲染 */
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  /** 首页文案与通用文案翻译函数 */
  const t = await getTranslations('home');
  const tCommon = await getTranslations('common');

  /** 最新文章数据（首页展示前 6 篇；接口失败时为 null 以区分错误态） */
  const postsData = await listPostsServer({ page: 1, limit: 6 }).catch(() => null);
  /** 首页展示的文章数组 */
  const latestPosts = postsData?.posts ?? [];
  /** 接口是否加载失败（区分空数据与错误态） */
  const postsLoadError = postsData === null;
  /** 是否还有更多文章 */
  const hasMore = (postsData?.total ?? 0) > latestPosts.length;

  return (
    <>
      {/* Hero 品牌宣传区 */}
      <section className="hero-section" aria-label={t('brandSection')}>
        <Container>
          <div className="grid grid-cols-1 items-center gap-(--space-10) max-lg:gap-10 lg:grid-cols-[1fr_480px]">
            {/* 左文案 */}
            {/* 左侧文案列 */}
            <div className="max-w-130 max-lg:max-w-none">
              {/* 品牌徽章（呼吸圆点 + 文案） */}
              <div className="animate-fade-in row-sm m-0 mb-8 flex">
                <span
                  className="hero-dot animate-breathing inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                  aria-hidden="true"
                />
                <span className="text-muted text-(length:--type-sm) font-medium tracking-[0.02em]">
                  {t('heroBadge')}
                </span>
              </div>

              <h1
                className="animate-fade-in display-serif text-heading hero-title m-0 mb-8 text-balance"
              >
                {t('heroTitleLine1')}
                <br />
                {t('heroTitlePrefix')}{' '}
                <em className="underline-accent text-heading font-medium italic">{t('heroTitleEm')}</em>
              </h1>

              <p className="animate-fade-in text-body hero-lead m-0 mb-10">
                {t('heroLead')}
              </p>

              {/* CTA 按钮组：浏览文章 + 开始写作 */}
              <div className="animate-fade-in flex flex-wrap items-center gap-5">
                <Button href="/posts" size="lg">
                  {t('browsePosts')}
                </Button>
                <WriteCta />
              </div>
            </div>

            {/* 右 Mac 代码窗口 — 纯渐入（不带位移：入场动画的 transform 会覆盖窗口的 3D 透视姿态） */}
            <div className="hero-code-window animate-fade-in overflow-hidden" aria-hidden="true">
              {/* 窗口栏 */}
              <div className="hero-titlebar row-sm border-stroke border-b px-5 py-3.5">
                <span className="hero-dot-close h-3 w-3 shrink-0 rounded-full transition-transform duration-200 hover:scale-110" />
                <span className="hero-dot-minimize h-3 w-3 shrink-0 rounded-full transition-transform duration-200 hover:scale-110" />
                <span className="hero-dot-maximize h-3 w-3 shrink-0 rounded-full transition-transform duration-200 hover:scale-110" />
                <span className="text-muted ml-auto font-mono text-(length:--type-xs) tracking-[0.02em]">
                  middleware/authGuard.ts
                </span>
              </div>

              {/* 代码主体 */}
              <pre className="text-body m-0 overflow-x-auto px-6 py-5 font-mono text-(length:--type-xs) leading-loose max-md:px-4 max-md:py-4">
                <code className="bg-none font-[inherit]">
                  <span className="tok-comment">{t('codeComment')}</span>
                  {'\n'}
                  <span className="tok-key">export const</span>{' '}
                  <span className="tok-fn">authGuard</span> <span className="tok-punct">=</span>{' '}
                  <span className="tok-key">async</span> <span className="tok-punct">(</span>
                  {'\n  '}
                  <span className="tok-fn">req</span>
                  <span className="tok-punct">:</span> <span className="tok-type">Request</span>
                  <span className="tok-punct">,</span>
                  {'\n  '}
                  <span className="tok-fn">next</span>
                  <span className="tok-punct">:</span>{' '}
                  <span className="tok-type">NextFunction</span>
                  <span className="tok-punct">,</span>
                  {'\n'}
                  <span className="tok-punct">{') => {'}</span>
                  {'\n  '}
                  <span className="tok-fn">req</span>
                  <span className="tok-punct">.</span>
                  <span className="tok-fn">user</span> <span className="tok-punct">=</span>{' '}
                  <span className="tok-key">await</span> <span className="tok-fn">verifyToken</span>
                  <span className="tok-punct">(</span>
                  <span className="tok-fn">req</span>
                  <span className="tok-punct">.</span>
                  <span className="tok-fn">cookies</span>
                  <span className="tok-punct">.</span>
                  <span className="tok-fn">auth_token</span>
                  <span className="tok-punct">);</span>
                  {'\n  '}
                  <span className="tok-fn">next</span>
                  <span className="tok-punct">();</span>
                  {'\n'}
                  <span className="tok-punct">{'};'}</span>
                </code>
              </pre>
            </div>
          </div>
        </Container>
      </section>

      {/* 最新文章区：三态渲染 — 加载失败错误态 / 有数据卡片列表 / 无数据不渲染 */}
      {/* 加载失败：展示错误提示与刷新入口 */}
      {postsLoadError ? (
        <section className="page-section animate-fade-in" aria-label={t('latestSection')}>
          <Container>
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h2 className="section-title">{t('latestTitle')}</h2>
              </div>
            </div>
            <EmptyState
              icon={<Search size={20} strokeWidth={2.5} />}
              title={t('loadErrorTitle')}
              description={t('loadErrorDesc')}
              action={<Button href="/">{tCommon('refresh')}</Button>}
            />
          </Container>
        </section>
      ) : (
        /* 有文章时渲染卡片网格 */
        latestPosts.length > 0 && (
          <section className="page-section animate-fade-in" aria-label={t('latestSection')}>
            <Container>
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h2 className="section-title">{t('latestTitle')}</h2>
                <p className="text-muted mt-2 text-(length:--type-sm) leading-normal">
                  {t('latestSubtitle')}
                </p>
              </div>
                <Button href="/posts" variant="ghost" size="sm">
                  {hasMore
                    ? t('viewAllCount', { count: postsData?.total ?? '' })
                    : t('viewAll')}
                </Button>
              </div>
              {/* 文章卡片网格，置顶文章追加 PinnedBadge */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {latestPosts.map((p, i) => (
                  <ArticleCard
                    key={p.id}
                    post={p}
                    href={`/posts/${p.id}`}
                    index={i}
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
