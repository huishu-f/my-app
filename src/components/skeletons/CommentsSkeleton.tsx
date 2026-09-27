import { BAR, line } from "@/components/skeletons/primitives";

const TITLE_LINE = line("h-[27px]");
const NAME_LINE = line("h-[24px]");
const TIME_LINE = line("h-[18px]");
const BODY_LINE = line("h-[24px]");

export function CommentCardSkeleton() {
  return (
    <div className="card row-md p-4">
      <span className={`${BAR} h-9 w-9 shrink-0 rounded-full`} />

      <div className="min-w-0 flex-1">
        <div className="row-md mb-1.5">
          <span className={NAME_LINE}>
            <span className={`${BAR} block h-3.5 w-24 rounded-xs`} />
          </span>

          <span className={TIME_LINE}>
            <span className={`${BAR} block h-3 w-16 rounded-xs`} />
          </span>
        </div>

        <p className="text-body text-(length:--type-sm) leading-normal">
          <span className={BODY_LINE}>
            <span className={`${BAR} block h-3.5 w-full rounded-xs`} />
          </span>
          <span className={BODY_LINE}>
            <span className={`${BAR} block h-3.5 w-2/3 rounded-xs`} />
          </span>
        </p>
      </div>
    </div>
  );
}

export function CommentsSkeleton() {
  return (
    <section className="mt-10 mb-12" aria-hidden="true">
      <h2 className="section-title mb-6">
        <span className={TITLE_LINE}>
          <span className={`${BAR} block h-4 w-28 rounded-xs`} />
        </span>
      </h2>

      <div className="mb-8">
        <span className={`${BAR} block h-[122px] w-full rounded-md`} />

        <div className="mt-4 flex justify-end">
          <span className={`${BAR} h-9 w-24 rounded-md`} />
        </div>
      </div>

      <div className="card-list">
        <CommentCardSkeleton />
      </div>
    </section>
  );
}
