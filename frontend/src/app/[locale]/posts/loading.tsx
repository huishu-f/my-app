/**
 * @file loading.tsx
 * @description 文章列表页加载骨架屏：按列表页实际布局（页头、侧边栏、搜索栏、卡片列表）
 *              逐块渲染 animate-pulse 占位，仅路由段数据加载期间展示。
 */
import { Container } from '@/components/ui/Container';

/**
 * Loading 文章列表页加载骨架屏组件
 */
export default function Loading() {
  return (
    <Container className="page-section">
      {/* 页头骨架：标题 + 副标题 */}
      <div className="page-header">
        <div className="bg-surface h-8 w-48 animate-pulse rounded-lg" />
        <div className="bg-surface mt-1.5 h-4 w-72 animate-pulse rounded" />
      </div>

      {/* 主体两列布局骨架：侧边栏 + 列表区 */}
      <div className="flex gap-12 max-lg:flex-col">
        {/* 侧边栏骨架 */}
        <aside className="w-65 shrink-0 max-lg:hidden">
          <div className="content-stack-lg sticky top-20">
            <div>
              <div className="bg-surface mb-3 h-3 w-12 animate-pulse rounded" />
              <div className="space-y-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="bg-surface h-9 w-full animate-pulse rounded-lg" />
                ))}
              </div>
            </div>
            <div>
              <div className="bg-surface mb-3 h-3 w-12 animate-pulse rounded" />
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="bg-surface h-6 w-16 animate-pulse rounded-full" />
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* 主内容区骨架 */}
        <div className="min-w-0 flex-1">
          {/* 搜索栏 + 统计骨架 */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="bg-surface h-4 w-24 animate-pulse rounded" />
            <div className="bg-surface h-10 w-50 animate-pulse rounded-lg" />
          </div>

          {/* 卡片列表骨架 */}
          <div className="card-list">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card p-6">
                <div className="flex flex-col gap-4 sm:flex-row">
                  {/* 封面 */}
                  <div className="bg-surface aspect-16/10 w-full shrink-0 animate-pulse rounded-lg sm:w-50" />
                  {/* 内容 */}
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="bg-surface h-3 w-16 animate-pulse rounded" />
                    <div className="bg-surface h-6 w-3/4 animate-pulse rounded" />
                    <div className="bg-surface h-3 w-full animate-pulse rounded" />
                    <div className="bg-surface h-3 w-2/3 animate-pulse rounded" />
                    {/* 标签行 */}
                    <div className="flex gap-2">
                      <div className="bg-surface h-5 w-12 animate-pulse rounded-full" />
                      <div className="bg-surface h-5 w-14 animate-pulse rounded-full" />
                    </div>
                    {/* 作者+日期+统计 */}
                    <div className="mt-auto flex items-center gap-2 pt-2">
                      <div className="bg-surface h-5 w-5 shrink-0 animate-pulse rounded-full" />
                      <div className="bg-surface h-3 w-16 animate-pulse rounded" />
                      <div className="bg-surface h-3 w-14 animate-pulse rounded" />
                      <div className="bg-surface h-3 w-10 animate-pulse rounded" />
                      <div className="bg-surface h-3 w-10 animate-pulse rounded" />
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
