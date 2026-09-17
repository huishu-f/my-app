/**
 * @file loading.tsx
 * @description /posts/[id] 文章详情路由的 Next.js 加载边界（loading.tsx）：渲染文章头部、封面、正文与侧栏目录的骨架占位
 */
import { Container } from '@/components/ui/Container';

export default function Loading() {
  return (
    <Container className="page-section">
      <div className="grid grid-cols-1 gap-10 pb-12 max-lg:gap-0 max-lg:pb-8 lg:grid-cols-[1fr_220px]">
        <article>
          <div className="mb-8 flex items-center gap-2">
            <div className="bg-surface h-4 w-4 animate-pulse rounded-xs" />
            <div className="bg-surface h-4 w-20 animate-pulse rounded-xs" />
          </div>

          <header className="mb-10">
            <div className="mb-5 flex gap-2">
              <div className="bg-surface h-6 w-16 animate-pulse rounded-full" />
            </div>
            <div className="bg-surface mb-5 h-9 w-2/3 animate-pulse rounded-md max-md:h-7" />
            <div className="bg-surface mb-2 h-4 w-full animate-pulse rounded-xs" />
            <div className="bg-surface mb-8 h-4 w-3/4 animate-pulse rounded-xs" />
            <div className="border-stroke mt-8 flex flex-wrap items-center gap-4 border-t pt-6">
              <div className="bg-surface h-10 w-10 animate-pulse rounded-full" />
              <div className="flex flex-col gap-1">
                <div className="bg-surface h-4 w-24 animate-pulse rounded-xs" />
                <div className="bg-surface h-3 w-36 animate-pulse rounded-xs" />
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="bg-surface h-4 w-10 animate-pulse rounded-xs" />
                <div className="bg-surface h-4 w-10 animate-pulse rounded-xs" />
                <div className="bg-surface h-4 w-10 animate-pulse rounded-xs" />
              </div>
            </div>
          </header>

          <div className="bg-surface mb-10 aspect-21/9 w-full animate-pulse rounded-2xl max-md:aspect-16/9" />

          <div className="space-y-3">
            <div className="bg-surface h-4 w-full animate-pulse rounded-xs" />
            <div className="bg-surface h-4 w-full animate-pulse rounded-xs" />
            <div className="bg-surface h-4 w-3/4 animate-pulse rounded-xs" />
            <div className="bg-surface h-4 w-full animate-pulse rounded-xs" />
            <div className="bg-surface h-4 w-5/6 animate-pulse rounded-xs" />
            <div className="bg-surface h-4 w-full animate-pulse rounded-xs" />
            <div className="bg-surface h-4 w-2/3 animate-pulse rounded-xs" />
          </div>

          <div className="mt-10 mb-8 grid gap-4 sm:grid-cols-2">
            <div className="card h-20 animate-pulse rounded-xl" />
            <div className="card h-20 animate-pulse rounded-xl" />
          </div>
        </article>

        <div className="hidden lg:block">
          <div className="sticky-below-nav space-y-2">
            <div className="bg-surface h-3 w-12 animate-pulse rounded-xs" />
            <div className="bg-surface h-3 w-32 animate-pulse rounded-xs" />
            <div className="bg-surface h-3 w-24 animate-pulse rounded-xs" />
            <div className="bg-surface h-3 w-28 animate-pulse rounded-xs" />
          </div>
        </div>
      </div>
    </Container>
  );
}
