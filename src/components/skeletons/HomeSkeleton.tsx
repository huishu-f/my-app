import { Container } from "@/components/ui/Container";
import { BAR, line } from "@/components/skeletons/primitives";

const HERO_KICKER_LINE = line("h-[22.4px]");

const HERO_HEADLINE_LINE = line("h-[69.12px]");

const HERO_LEAD_LINE = line("h-[30.6px]");

const CODE_LINE = line("h-[23.8px]");

const CAT_LINE = line("h-[18px]");
const TITLE_LINE = line("h-[27px]");
const SUMMARY_LINE = line("h-[24px]");
const META_LINE = line("h-[18px]");

const CODE_LINES = [
  "w-2/5",
  "ml-4 w-3/5",
  "ml-4 w-1/2",
  "ml-8 w-2/3",
  "ml-8 w-1/3",
  "ml-4 w-1/2",
  "w-2/5",
  "ml-4 w-1/2",
];

function HomeCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex h-full flex-col gap-4">
        <div className={`${BAR} aspect-16/10 w-full shrink-0 rounded-md`} />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="row-sm">
            <span className={CAT_LINE}>
              <span className={`${BAR} block h-3 w-16 rounded-xs`} />
            </span>
          </div>

          <h2 className="section-title line-clamp-2 tracking-[-0.01em]">
            <span className={TITLE_LINE}>
              <span className={`${BAR} block h-4 w-4/5 rounded-xs`} />
            </span>
          </h2>

          <p className="text-body line-clamp-2 text-(length:--type-sm) leading-normal">
            <span className={SUMMARY_LINE}>
              <span className={`${BAR} block h-3.5 w-full rounded-xs`} />
            </span>
          </p>

          <div className="meta-text mt-auto flex items-center gap-2">
            <span className={`${BAR} size-5 shrink-0 rounded-full`} />
            <span className={META_LINE}>
              <span className={`${BAR} block h-3 w-20 rounded-xs`} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div aria-hidden="true">
      <section className="hero-section">
        <Container>
          <div className="grid grid-cols-1 items-center gap-(--space-10) max-lg:gap-10 lg:grid-cols-[1fr_480px]">
            <div className="max-w-152 max-lg:max-w-none">
              <div className="row-sm m-0 mb-8 flex">
                <span className="hero-dot inline-block h-1.5 w-1.5 shrink-0 rounded-full" />
                <span className={HERO_KICKER_LINE}>
                  <span className={`${BAR} block h-3 w-36 rounded-xs`} />
                </span>
              </div>

              <h1 className="m-0 mb-8">
                <span className="hero-kicker">
                  <span className={line("h-[12px]")}>
                    <span className={`${BAR} block h-3 w-24 rounded-xs`} />
                  </span>
                </span>

                <span className="hero-headline text-heading">
                  <span className={HERO_HEADLINE_LINE}>
                    <span className={`${BAR} block h-10 w-4/5 rounded-md`} />
                  </span>
                </span>
              </h1>

              <p className="text-body hero-lead m-0 mb-10">
                <span className={HERO_LEAD_LINE}>
                  <span className={`${BAR} block h-4 w-full rounded-xs`} />
                </span>
              </p>

              <div className="flex flex-wrap items-center gap-5">
                <span className={`${BAR} h-10 w-28 rounded-md`} />
                <span className={`${BAR} h-10 w-28 rounded-md`} />
              </div>
            </div>

            <div className="hero-code-window overflow-hidden">
              <div className="hero-titlebar row-sm border-stroke border-b px-5 py-3.5">
                <span className="hero-dot-close h-3 w-3 shrink-0 rounded-full" />
                <span className="hero-dot-minimize h-3 w-3 shrink-0 rounded-full" />
                <span className="hero-dot-maximize h-3 w-3 shrink-0 rounded-full" />

                <span className="ml-auto">
                  <span className={CODE_LINE}>
                    <span className={`${BAR} block h-3 w-40 rounded-xs`} />
                  </span>
                </span>
              </div>

              <div className="px-6 py-5 max-md:px-4 max-md:py-4">
                {CODE_LINES.map((width, i) => (
                  <span key={i} className={CODE_LINE}>
                    <span className={`${BAR} block h-3 rounded-xs ${width}`} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="page-section">
        <Container>
          <div className="page-header flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title">
                <span className={TITLE_LINE}>
                  <span className={`${BAR} block h-4 w-28 rounded-xs`} />
                </span>
              </h2>

              <p className="text-muted mt-2 text-(length:--type-xs) leading-normal">
                <span className={line("h-[21px]")}>
                  <span className={`${BAR} block h-3.5 w-44 rounded-xs`} />
                </span>
              </p>
            </div>

            <span className={`${BAR} h-8 w-20 shrink-0 rounded-md`} />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <HomeCardSkeleton key={i} />
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
