import { BAR, line } from "@/components/skeletons/primitives";

const NAV_LABEL_LINE = line("h-[19.2px]");
const NAV_TITLE_LINE = line("h-[25.6px]");

export function NeighborPostsSkeleton() {
  return (
    <nav className="mt-10 mb-8 grid gap-4 sm:grid-cols-2" aria-hidden="true">
      {[0, 1].map((i) => (
        <div key={i} className="card flex flex-col gap-1 p-4">
          <span className="text-faint flex items-center gap-1 text-(length:--type-2xs) font-medium">
            <span className={NAV_LABEL_LINE}>
              <span className={`${BAR} block h-3 w-16 rounded-xs`} />
            </span>
          </span>

          <span className="text-heading line-clamp-2 text-(length:--type-sm) font-semibold">
            <span className={NAV_TITLE_LINE}>
              <span className={`${BAR} block h-3.5 w-4/5 rounded-xs`} />
            </span>
          </span>
        </div>
      ))}
    </nav>
  );
}
