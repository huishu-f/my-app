import { Container } from "@/components/ui/Container";
import { BAR } from "@/components/skeletons/primitives";

const PARAGRAPHS = [
  ["w-full", "w-full", "w-11/12", "w-full", "w-3/5"],
  ["w-full", "w-5/6", "w-full", "w-2/3"],
];

export function PostDetailSkeleton() {
  return (
    <Container className="page-section">
      <div
        className="grid grid-cols-1 gap-10 pb-12 max-lg:gap-0 max-lg:pb-8 lg:grid-cols-[1fr_220px]"
        aria-hidden="true"
      >
        <article>
          <span className={`${BAR} mb-6 block h-4 w-20 rounded-xs`} />

          <header className="mb-10">
            <div className="row-sm mb-5">
              <span className={`${BAR} h-6 w-20 rounded-full`} />
            </div>

            <span className={`${BAR} block h-9 w-full rounded-md`} />
            <span className={`${BAR} mt-3 block h-9 w-3/4 rounded-md`} />

            <div className="mt-5 space-y-2.5">
              <span className={`${BAR} block h-4 w-full rounded-xs`} />
              <span className={`${BAR} block h-4 w-2/5 rounded-xs`} />
            </div>

            <div className="row-lg border-stroke mt-8 flex-wrap border-t pt-6">
              <div className="flex items-center gap-3 max-md:gap-2.5">
                <span className={`${BAR} h-10 w-10 shrink-0 rounded-full`} />
                <div className="flex flex-col gap-1.5">
                  <span className={`${BAR} h-4 w-24 rounded-xs`} />
                  <span className={`${BAR} h-3 w-36 rounded-xs`} />
                </div>
              </div>
              <div className="row-md">
                <span className={`${BAR} h-4 w-12 rounded-xs`} />
                <span className={`${BAR} h-4 w-12 rounded-xs`} />
                <span className={`${BAR} h-4 w-12 rounded-xs`} />
              </div>
            </div>

            <span className={`${BAR} mt-6 block h-9 w-44 rounded-md`} />
          </header>

          <div className={`${BAR} mb-10 aspect-21/9 w-full rounded-2xl max-md:aspect-16/9`} />

          <div className="space-y-8">
            {PARAGRAPHS.map((lines, i) => (
              <div key={i} className="space-y-3">
                {lines.map((width, j) => (
                  <span key={j} className={`${BAR} block h-4 rounded-xs ${width}`} />
                ))}
              </div>
            ))}

            <div className="border-stroke flex flex-wrap gap-2 border-t pt-8">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`${BAR} h-6 w-16 rounded-full`} />
              ))}
            </div>

            <div className="row-lg border-stroke flex-wrap border-t border-b py-8">
              <span className={`${BAR} h-11 w-28 rounded-full`} />
              <span className={`${BAR} h-11 w-28 rounded-full`} />
              <span className={`${BAR} h-4 w-20 rounded-xs`} />
            </div>

            <div className="space-y-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <span className={`${BAR} h-9 w-9 shrink-0 rounded-full`} />
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <span className={`${BAR} block h-3.5 w-32 rounded-xs`} />
                    <span className={`${BAR} block h-3.5 w-full rounded-xs`} />
                    <span className={`${BAR} block h-3.5 w-1/2 rounded-xs`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <aside className="max-lg:hidden">
          <div className="sticky-below-nav space-y-3">
            <span className={`${BAR} block h-3 w-16 rounded-xs`} />
            <div className="border-stroke space-y-2.5 border-l pl-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className={`${BAR} block h-3 rounded-xs ${i % 3 === 1 ? "w-4/5" : "w-full"}`}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </Container>
  );
}
