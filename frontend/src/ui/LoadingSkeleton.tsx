/**
 * @file LoadingSkeleton.tsx
 * @description 写作页骨架屏：用灰色脉动块复刻 WriteEditor 编辑态的布局，在拉取待编辑文章期间替换整个表单；纯静态无 props 无交互，表单结构变动时需同步占位块高度
 */
import { Container } from '@/ui/Container';

/**
 * LoadingSkeleton 写作页骨架屏（无入参，由 WriteEditor 在编辑态取数据期间自行渲染）
 */
export function LoadingSkeleton() {
  return (
    // 各占位块的宽高刻意对齐 WriteEditor 的真实 DOM，避免数据到达后页面高度跳变
    <Container className="page-section max-w-350">
      <header className="page-header flex items-end justify-between gap-4">
        <div>
          <div className="bg-surface h-8 w-32 animate-pulse rounded-md" />
        </div>
        <div className="flex gap-1">
          <div className="bg-surface h-8 w-9 animate-pulse rounded-md" />
          <div className="bg-surface h-8 w-20 animate-pulse rounded-md" />
          <div className="bg-surface h-8 w-9 animate-pulse rounded-md" />
        </div>
      </header>

      <div className="form-stack">
        <div className="bg-surface h-14 w-full animate-pulse rounded-md" />

        {/* 桌面端编辑/预览双栏；其后的 lg:hidden 块是移动端单栏版本，两套 DOM 靠断点互斥显示 */}
        <div className="hidden gap-4 lg:grid lg:grid-cols-2">
          <div className="border-stroke rounded-xl border">
            <div className="border-stroke flex items-center gap-2 border-b px-3 py-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-surface h-5 w-5 animate-pulse rounded-xs" />
              ))}
            </div>
            <div className="space-y-2 p-4">
              {/* 行宽用 i 取模伪随机（下述几处同理），整列等宽会看起来像色块而非文字 */}
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-surface h-3 animate-pulse rounded-xs"
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
                  className="bg-surface h-3 animate-pulse rounded-xs"
                  style={{ width: `${60 + ((i * 11) % 40)}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="border-stroke rounded-xl border lg:hidden">
          <div className="border-stroke flex items-center gap-2 border-b px-3 py-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-surface h-5 w-5 animate-pulse rounded-xs" />
            ))}
          </div>
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface h-3 animate-pulse rounded-xs"
                style={{ width: `${65 + ((i * 7) % 35)}%` }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
          <div>
            <div className="bg-surface mb-2 h-3 w-10 animate-pulse rounded-xs" />
            <div className="bg-surface h-10 w-full animate-pulse rounded-md" />
          </div>
          <div>
            <div className="bg-surface mb-2 h-3 w-10 animate-pulse rounded-xs" />
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-surface h-6 w-16 animate-pulse rounded-full" />
              <div className="bg-surface h-9 w-32 animate-pulse rounded-md" />
            </div>
          </div>
        </div>

        <div>
          <div className="bg-surface mb-2 h-3 w-20 animate-pulse rounded-xs" />
          <div className="bg-surface h-10 w-full animate-pulse rounded-md" />
        </div>

        <div>
          <div className="bg-surface mb-2 h-3 w-10 animate-pulse rounded-xs" />
          <div className="bg-surface h-16 w-full animate-pulse rounded-md" />
        </div>

        <div className="border-stroke mt-8 flex items-center justify-between border-t pt-6">
          <div className="bg-surface h-4 w-24 animate-pulse rounded-xs" />
          <div className="flex gap-2">
            <div className="bg-surface h-9 w-16 animate-pulse rounded-md" />
            <div className="bg-surface h-9 w-24 animate-pulse rounded-md" />
          </div>
        </div>
      </div>
    </Container>
  );
}
