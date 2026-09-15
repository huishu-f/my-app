/**
 * @file not-found.tsx
 * @description 404 页面，展示页面不存在提示并提供返回首页入口
 */
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';

/**
 * NotFound 404 页面
 */
export default function NotFound() {
  return (
    <Container className="page-section">
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="display-serif text-heading mb-5 text-(length:--type-6xl) leading-tight font-bold">
          404
        </h1>
        <p className="text-muted mb-10 max-w-90 text-(length:--type-lg) leading-relaxed">
          你访问的页面不存在或已被移动。
        </p>
        <div className="flex items-center gap-3">
          <Button href="/">返回首页</Button>
          <Button variant="ghost" href="/posts">
            浏览文章
          </Button>
        </div>
      </div>
    </Container>
  );
}
