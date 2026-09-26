import { Container } from "@/components/ui/Container";
import { BAR, line } from "@/components/skeletons/primitives";

const NAME_LINE = line("h-[25px]");
const META_LINE = line("h-[18px]");
const BIO_LINE = line("h-[22.4px]");
const STAT_VALUE_LINE = line("h-[38.4px]");
const STAT_LABEL_LINE = line("h-[19.2px]");

const CAT_LINE = line("h-[18px]");
const TITLE_LINE = line("h-[27px]");
const SUMMARY_LINE = line("h-[24px]");
const MORE_LINE = line("h-[19.2px]");

function MetaRow({ w }: { w: string }) {
  return (
    <span className={`${META_LINE} gap-2`}>
      <span className={`${BAR} size-3.5 shrink-0 rounded-xs`} />
      <span className={`${BAR} block h-3 ${w} rounded-xs`} />
    </span>
  );
}

function CardSkeleton() {
  return (
    <div className="card p-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className={`${BAR} aspect-16/10 w-full shrink-0 rounded-md sm:aspect-auto sm:w-50`} />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <span className={CAT_LINE}>
            <span className={`${BAR} block h-3 w-10 rounded-xs`} />
          </span>
          <span className={TITLE_LINE}>
            <span className={`${BAR} block h-4 w-4/5 rounded-xs`} />
          </span>
          <span className={SUMMARY_LINE}>
            <span className={`${BAR} block h-3.5 w-full rounded-xs`} />
          </span>
          <div className="row-sm meta-text mt-auto h-5 flex-wrap">
            <span className={`${BAR} h-5 w-5 shrink-0 rounded-full`} />
            <span className={`${BAR} h-3 w-20 rounded-xs`} />
            <span className={`${BAR} h-3 w-16 rounded-xs`} />
            <span className={`${BAR} h-3 w-10 rounded-xs`} />
          </div>
          <span className={`${MORE_LINE} mt-2`}>
            <span className={`${BAR} block h-3 w-14 rounded-xs`} />
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <Container className="page-section">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[300px_1fr]" aria-hidden="true">
        <aside>
          <div className="sticky-below-nav">
            <section className="card overflow-hidden shadow-(--shadow-sm)">
              <div className="profile-cover-band h-24 w-full" />

              <div className="px-6 pb-7">
                <div className="-mt-5">
                  <span className={`${BAR} border-card-bg block h-14 w-14 rounded-full border-4`} />
                </div>

                <div className="mt-5">
                  <span className={NAME_LINE}>
                    <span className={`${BAR} block h-5 w-32 rounded-xs`} />
                  </span>
                  <span className={`${META_LINE} mt-1`}>
                    <span className={`${BAR} block h-3 w-20 rounded-xs`} />
                  </span>
                </div>

                <div className="mt-4">
                  <span className={BIO_LINE}>
                    <span className={`${BAR} block h-3.5 w-full rounded-xs`} />
                  </span>
                  <span className={BIO_LINE}>
                    <span className={`${BAR} block h-3.5 w-4/5 rounded-xs`} />
                  </span>
                </div>

                <div className="mt-5 space-y-2">
                  <MetaRow w="w-28" />
                  <MetaRow w="w-36" />
                  <MetaRow w="w-28" />
                  <MetaRow w="w-24" />
                </div>

                <div className="border-stroke mt-6 border-t pt-6">
                  <div className="stats-grid">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="stat-item">
                        <span className={STAT_VALUE_LINE}>
                          <span className={`${BAR} block h-6 w-10 rounded-xs`} />
                        </span>
                        <span className={STAT_LABEL_LINE}>
                          <span className={`${BAR} block h-3 w-12 rounded-xs`} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="row-md mt-6">
                  <span className={`${BAR} h-9 flex-1 rounded-md`} />
                  <span className={`${BAR} h-9 flex-1 rounded-md`} />
                </div>
              </div>
            </section>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="segmented">
            <span className="segmented-item segmented-item-on">
              <span className={`${BAR} block h-[21px] w-13 rounded-xs`} />
            </span>
            <span className="segmented-item">
              <span className={`${BAR} block h-[21px] w-12 rounded-xs`} />
            </span>
            <span className="segmented-item">
              <span className={`${BAR} block h-[21px] w-12 rounded-xs`} />
            </span>
          </div>

          <div className="card-list mt-10">
            {[0, 1, 2].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
