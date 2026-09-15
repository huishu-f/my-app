/**
 * @file LoadingSkeleton.tsx
 * @description 写文章编辑器加载骨架屏，匹配编辑页布局（PageHeader、标题、编辑器、分类标签、封面、摘要、底部操作栏）；仅编辑页数据加载期间渲染
 */
import { Container } from './Container';

/**
 * LoadingSkeleton 写文章编辑器加载骨架屏
 */
export function LoadingSkeleton() {
  return (
    <Container className="page-section max-w-350">
      {/* PageHeader 骨架 */}
      <header className="page-header flex items-end justify-between gap-4">
        <div>
          <div className="bg-surface h-8 w-32 animate-pulse rounded-lg" />
        </div>
        <div className="flex gap-1">
          <div className="bg-surface h-8 w-9 animate-pulse rounded-lg" />
          <div className="bg-surface h-8 w-20 animate-pulse rounded-lg" />
          <div className="bg-surface h-8 w-9 animate-pulse rounded-lg" />
        </div>
      </header>

      <div className="form-stack">
        {/* 标题输入框骨架 */}
        <div className="bg-surface h-14 w-full animate-pulse rounded-lg" />

        {/* 内容编辑器骨架（桌面两栏） */}
        <div className="hidden gap-4 lg:grid lg:grid-cols-2">
          <div className="border-stroke rounded-xl border">
            <div className="border-stroke flex items-center gap-2 border-b px-3 py-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-surface h-5 w-5 animate-pulse rounded" />
              ))}
            </div>
            <div className="space-y-2 p-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-surface h-3 animate-pulse rounded"
                  style={{ width: `${65 + ((i * 7) % 35)}%` }}
                />
              ))}
            </div>
          </div>
          <div className="border-stroke rounded-xl border">
            <div className="space-y-2 p-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-surface h-3 animate-pulse rounded"
                  style={{ width: `${60 + ((i * 11) % 40)}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 内容编辑器骨架（移动端单栏） */}
        <div className="border-stroke rounded-xl border lg:hidden">
          <div className="border-stroke flex items-center gap-2 border-b px-3 py-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-surface h-5 w-5 animate-pulse rounded" />
            ))}
          </div>
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface h-3 animate-pulse rounded"
                style={{ width: `${65 + ((i * 7) % 35)}%` }}
              />
            ))}
          </div>
        </div>

        {/* 分类 + 标签骨架 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
          <div>
            <div className="bg-surface mb-2 h-3 w-10 animate-pulse rounded" />
            <div className="bg-surface h-10 w-full animate-pulse rounded-lg" />
          </div>
          <div>
            <div className="bg-surface mb-2 h-3 w-10 animate-pulse rounded" />
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-surface h-6 w-16 animate-pulse rounded-full" />
              <div className="bg-surface h-9 w-32 animate-pulse rounded-lg" />
            </div>
          </div>
        </div>

        {/* 封面图链接骨架 */}
        <div>
          <div className="bg-surface mb-2 h-3 w-20 animate-pulse rounded" />
          <div className="bg-surface h-10 w-full animate-pulse rounded-lg" />
        </div>

        {/* 摘要骨架 */}
        <div>
          <div className="bg-surface mb-2 h-3 w-10 animate-pulse rounded" />
          <div className="bg-surface h-16 w-full animate-pulse rounded-lg" />
        </div>

        {/* 底部操作栏骨架 */}
        <div className="border-stroke mt-8 flex items-center justify-between border-t pt-6">
          <div className="bg-surface h-4 w-24 animate-pulse rounded" />
          <div className="flex gap-2">
            <div className="bg-surface h-9 w-16 animate-pulse rounded-lg" />
            <div className="bg-surface h-9 w-24 animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    </Container>
  );
}
