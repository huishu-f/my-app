/**
 * @file loading.tsx
 * @description /posts 文章列表路由的 Next.js 加载边界（loading.tsx）：数据获取期间渲染侧栏、搜索栏与文章卡片的骨架占位
 */
import { Container } from '@/components/ui/Container';

export default function Loading() {
  return (
    <Container className="page-section">
      <div className="page-header">
        <div className="bg-surface h-8 w-48 animate-pulse rounded-md" />
        <div className="bg-surface mt-1.5 h-4 w-72 animate-pulse rounded-xs" />
      </div>

      <div className="flex gap-12 max-lg:flex-col">
        <aside className="w-65 shrink-0 max-lg:hidden">
          <div className="content-stack-lg sticky-below-nav">
            <div>
              <div className="bg-surface mb-3 h-3 w-12 animate-pulse rounded-xs" />
              <div className="space-y-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="bg-surface h-9 w-full animate-pulse rounded-md" />
                ))}
              </div>
            </div>
            <div>
              <div className="bg-surface mb-3 h-3 w-12 animate-pulse rounded-xs" />
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="bg-surface h-6 w-16 animate-pulse rounded-full" />
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="page-actions mb-6">
            <div className="bg-surface h-4 w-24 animate-pulse rounded-xs" />
            <div className="bg-surface h-10 w-50 animate-pulse rounded-md" />
          </div>

          <div className="card-list">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card p-6">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="bg-surface aspect-16/10 w-full shrink-0 animate-pulse rounded-md sm:w-50" />
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="bg-surface h-3 w-16 animate-pulse rounded-xs" />
                    <div className="bg-surface h-6 w-3/4 animate-pulse rounded-xs" />
                    <div className="bg-surface h-3 w-full animate-pulse rounded-xs" />
                    <div className="bg-surface h-3 w-2/3 animate-pulse rounded-xs" />
                    <div className="flex gap-2">
                      <div className="bg-surface h-5 w-12 animate-pulse rounded-full" />
                      <div className="bg-surface h-5 w-14 animate-pulse rounded-full" />
                    </div>
                    <div className="mt-auto flex items-center gap-2 pt-2">
                      <div className="bg-surface h-5 w-5 shrink-0 animate-pulse rounded-full" />
                      <div className="bg-surface h-3 w-16 animate-pulse rounded-xs" />
                      <div className="bg-surface h-3 w-14 animate-pulse rounded-xs" />
                      <div className="bg-surface h-3 w-10 animate-pulse rounded-xs" />
                      <div className="bg-surface h-3 w-10 animate-pulse rounded-xs" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
