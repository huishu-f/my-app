/**
 * @file not-found.tsx
 * @description locale 段 404 页面：展示「页面不存在」提示，提供返回首页与浏览文章入口
 */
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';

/**
 * NotFound 404 页面组件
 * 渲染 404 大标题、描述文案与两个导航按钮
 */
export default function NotFound() {
  /** 错误文案翻译函数 */
  const t = useTranslations('errors');
  return (
    <Container className="page-section">
      {/* 404 提示主体：标题 + 描述 */}
      <div className="animate-fade-in flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="display-serif text-heading mb-5 text-(length:--type-6xl) leading-tight font-bold">
          404
        </h1>
        <p className="text-muted mb-10 max-w-90 text-(length:--type-lg) leading-relaxed">
          {t('notFoundDesc')}
        </p>
        {/* 导航按钮组：返回首页 / 浏览文章 */}
        <div className="flex items-center gap-3">
          <Button href="/">{t('goHome')}</Button>
          <Button variant="ghost" href="/posts">
            {t('browsePosts')}
          </Button>
        </div>
      </div>
    </Container>
  );
}
