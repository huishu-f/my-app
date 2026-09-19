/**
 * @file not-found.tsx
 * @description /{locale} 段的 404 页面：段内页面调用 notFound()（如文章不存在、首页 locale 校验失败）与 catch-all 兜底路由命中此页；因仍套 [locale] 布局，Tailwind 与 next-intl 均可用（根级 app/not-found.tsx 则需自带样式与硬编码文案）
 */
import { useTranslations } from 'next-intl';
import { Button } from '@/ui/Button';
import { Container } from '@/ui/Container';

/**
 * 段内 404 展示（无 props）：仅提示未找到并提供返回首页与浏览文章两个出口
 */
export default function NotFound() {
  /** errors 命名空间文案，语言由外层 NextIntlClientProvider 决定 */
  const t = useTranslations('errors');
  return (
    <Container className="page-section">
      {/* 404 作为通用状态码不进 i18n，仅描述文案随语言切换 */}
      <div className="animate-fade-in flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="display-serif text-heading mb-5 text-(length:--type-3xl) leading-tight font-bold">
          404
        </h1>
        <p className="text-muted mb-10 max-w-90 text-(length:--type-base) leading-relaxed">
          {t('notFoundDesc')}
        </p>
        {/* 两个出口都写裸路径：Button 内部为 next-intl Link，会保留当前语言前缀；主动作回语言首页，次动作去文章列表 */}
        <div className="flex items-center gap-3">
          <Button href="/">{t('goHome')}</Button>
          <Button variant="outline" href="/posts">
            {t('browsePosts')}
          </Button>
        </div>
      </div>
    </Container>
  );
}
