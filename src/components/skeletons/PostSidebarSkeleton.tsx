import { BAR, line } from "@/components/skeletons/primitives";

const FILTER_LINE = line("h-[22.4px]");

export function PostSidebarSkeleton() {
  return (
    <aside className="hidden w-65 shrink-0 lg:block">
      <div className="content-stack-lg sticky-below-nav">
        <div>
          <h3 className="filter-heading mb-3">
            <span className={line("h-[19.2px]")}>
              <span className={`${BAR} block h-3 w-10 rounded-xs`} />
            </span>
          </h3>

          <ul className="space-y-1">
            {[0, 1, 2, 3].map((i) => (
              <li key={i}>
                <span className="flex w-full items-center rounded-md px-3 py-2 text-(length:--type-xs) font-medium">
                  <span className={FILTER_LINE}>
                    <span className={`${BAR} block h-3.5 w-16 rounded-xs`} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8">
          <h3 className="filter-heading mb-3">
            <span className={line("h-[19.2px]")}>
              <span className={`${BAR} block h-3 w-8 rounded-xs`} />
            </span>
          </h3>

          <div className="flex flex-wrap gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="badge">
                <span className={`${BAR} block h-4 ${["w-12", "w-16", "w-10"][i]} rounded-full`} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
