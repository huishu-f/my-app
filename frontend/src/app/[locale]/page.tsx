/**
 * @file page.tsx
 * @description 站点首页（/{locale}）：服务端渲染 Hero 品牌区与最新 6 篇文章预览；列表数据按 60s ISR 复用，接口失败时整块换成可重试空态，不阻塞首屏
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

/** 本页 ISR 缓存复用周期，单位 s：新鲜度由数据层 unstable_cache 的 posts 标签失效接管，周期仅作兜底 */
export const revalidate = 3600;

/**
 * 首页：Hero 品牌区 + 最新文章预览
 * @param props.params 动态段参数 Promise（新版 App Router 布局/页面约定），await 后取 locale
 * @throws locale 不在 routing.locales 白名单内时调用 notFound() 转入 404
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // 与布局保持一致：固定本次请求语言，避免渲染阶段再次触发语言协商而失去静态渲染
  setRequestLocale(locale);

  /** t：首页文案；tCommon：跨页通用文案（此处只用到"刷新"按钮） */
  const t = await getTranslations('home');
  const tCommon = await getTranslations('common');

  // 只取最新 6 篇用于预览区；catch 成 null 而非 []，以便区分"接口失败"与"确实没有文章"
  const postsData = await listPostsServer({ page: 1, limit: 6 }).catch(() => null);

  const latestPosts = postsData?.posts ?? [];

  /** 取数失败的标记：null 只代表请求异常，空列表不算失败 */
  const postsLoadError = postsData === null;

  /** 总数超过已取条数时，列表入口按钮改为展示"查看全部（N）" */
  const hasMore = (postsData?.total ?? 0) > latestPosts.length;

  return (
    <>
      <section className="hero-section" aria-label={t('heroSection')}>
        <Container>
          <div className="grid grid-cols-1 items-center gap-(--space-10) max-lg:gap-10 lg:grid-cols-[1fr_480px]">
            <div className="max-w-152 max-lg:max-w-none">
              <div className="animate-fade-in row-sm m-0 mb-8 flex">
                <span
                  className="hero-dot animate-breathing inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                  aria-hidden="true"
                />
                <span className="text-muted text-(length:--type-xs) font-medium tracking-[0.02em]">
                  {t('heroBadge')}
                </span>
              </div>

              <h1 className="animate-fade-in m-0 mb-8 text-balance">
                <span className="hero-kicker">{t('heroKicker')}</span>
                <span className="hero-headline text-heading">{t('heroTitle')}</span>
              </h1>

              <p className="animate-fade-in text-body hero-lead m-0 mb-10">{t('heroLead')}</p>

              <div className="animate-fade-in flex flex-wrap items-center gap-5">
                <Button href="/posts" size="lg">
                  {t('browsePosts')}
                </Button>
                <WriteCta />
              </div>
            </div>

            {/* 纯装饰的"代码窗口"：展示 authGuard 伪代码片段，aria-hidden 让读屏器整块跳过 */}
            <div className="hero-code-window animate-fade-in overflow-hidden" aria-hidden="true">
              {/* 装饰圆点开窗三点：纯装饰，不做 hover 反馈——非交互元素一旦有悬停特效会误导读成可点击，
                  且外层 hero-code-window 已有 3D 回正 + 阴影的悬停反馈，三点各自缩放属重复特效 */}
              <div className="hero-titlebar row-sm border-stroke border-b px-5 py-3.5">
                <span className="hero-dot-close h-3 w-3 shrink-0 rounded-full" />
                <span className="hero-dot-minimize h-3 w-3 shrink-0 rounded-full" />
                <span className="hero-dot-maximize h-3 w-3 shrink-0 rounded-full" />
                <span className="text-muted ml-auto font-mono text-(length:--type-2xs) tracking-[0.02em]">
                  middleware/authGuard.ts
                </span>
              </div>

              {/* pre 内不自动折行，换行靠逐个 '\n' 字符串显式插入；tok-* 类只做语法高亮着色，不改变内容 */}
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

      {/* 文章区的两种降级路径：接口失败时只替换本区块（上方 Hero 照常渲染）并给出刷新入口；取数成功但暂无文章时整块不渲染 */}
      {postsLoadError ? (
        <section className="page-section animate-fade-in" aria-label={t('latestSection')}>
          <Container>
            <div className="page-header">
              <h2 className="section-title">{t('latestTitle')}</h2>
            </div>
            {/* Button 的 href 走 next-intl Link：写裸路径 "/" 也会自动补上当前 locale 前缀 */}
            <EmptyState
              icon={<Search size={20} strokeWidth={2.5} />}
              title={t('loadErrorTitle')}
              description={t('loadErrorDesc')}
              action={<Button href="/">{tCommon('refresh')}</Button>}
            />
          </Container>
        </section>
      ) : (
        latestPosts.length > 0 && (
          <section className="page-section animate-fade-in" aria-label={t('latestSection')}>
            <Container>
              <div className="page-header flex items-end justify-between gap-4">
                <div>
                  <h2 className="section-title">{t('latestTitle')}</h2>
                  <p className="text-muted mt-2 text-(length:--type-xs) leading-normal">
                    {t('latestSubtitle')}
                  </p>
                </div>
                <Button href="/posts" variant="ghost" size="sm">
                  {hasMore ? t('viewAllCount', { count: postsData?.total ?? '' }) : t('viewAll')}
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
