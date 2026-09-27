import { BAR, line } from "@/components/skeletons/primitives";
import { PostSidebarSkeleton } from "@/components/skeletons/PostSidebarSkeleton";

const CAT_LINE = line("h-[18px]");
const TITLE_LINE = line("h-[27px]");
const SUMMARY_LINE = line("h-[24px]");
const MORE_LINE = line("h-[19.2px]");

function CardSkeleton() {
  return (
    <div className="card p-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className={`${BAR} aspect-16/10 w-full shrink-0 rounded-md sm:aspect-auto sm:w-50`} />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="row-sm">
            <span className={CAT_LINE}>
              <span className={`${BAR} block h-3 w-12 rounded-xs`} />
            </span>
          </div>

          <h2 className="section-title line-clamp-2 tracking-[-0.01em]">
            <span className={TITLE_LINE}>
              <span className={`${BAR} block h-4 w-3/5 rounded-xs`} />
            </span>
          </h2>

          <p className="text-body line-clamp-2 text-(length:--type-sm) leading-normal sm:line-clamp-3">
            <span className={SUMMARY_LINE}>
              <span className={`${BAR} block h-3.5 w-full rounded-xs`} />
            </span>
            <span className={SUMMARY_LINE}>
              <span className={`${BAR} block h-3.5 w-4/5 rounded-xs`} />
            </span>
          </p>

          <div className="row-sm meta-text mt-auto flex-wrap">
            <span className={`${BAR} h-5 w-5 shrink-0 rounded-full`} />
            <span className={line("h-[18px]")}>
              <span className={`${BAR} block h-3 w-20 rounded-xs`} />
            </span>
            <span className={`${BAR} size-1 shrink-0 rounded-full`} />
            <span className={line("h-[18px]")}>
              <span className={`${BAR} block h-3 w-16 rounded-xs`} />
            </span>
            <span className={`${BAR} size-1 shrink-0 rounded-full`} />
            <span className={line("h-[18px]")}>
              <span className={`${BAR} block h-3 w-10 rounded-xs`} />
            </span>
          </div>

          <span className="text-muted mt-2 inline-flex items-center gap-1 text-(length:--type-2xs)">
            <span className={MORE_LINE}>
              <span className={`${BAR} block h-3 w-14 rounded-xs`} />
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function PostsBodySkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-5 flex lg:hidden">
        <span className={`${BAR} h-8 w-24 rounded-md`} />
      </div>

      <div className="flex gap-12 max-lg:flex-col">
        <PostSidebarSkeleton />

        <div className="min-w-0 flex-1">
          <div className="page-actions mb-6">
            <p className="text-body text-(length:--type-xs) leading-normal font-medium">
              <span className={line("h-[21px]")}>
                <span className={`${BAR} block h-3.5 w-14 rounded-xs`} />
              </span>
            </p>

            <div className="row-md flex-wrap">
              <span className={`${BAR} h-10 w-50 shrink-0 rounded-md`} />
            </div>
          </div>

          <div className="card-list">
            {[0, 1, 2].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
