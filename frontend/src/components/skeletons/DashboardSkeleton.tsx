import { Container } from "@/components/ui/Container";
import { BAR, PAGE_SUBTITLE_LINE, PAGE_TITLE_LINE } from "@/components/skeletons/primitives";

export function DashboardSkeleton() {
  return (
    <Container className="page-section">
      <div aria-hidden="true">
        <header className="page-header">
          <div>
            <span className="page-title max-md:page-title-mobile block">
              <span className={PAGE_TITLE_LINE}>
                <span className={`${BAR} block h-6 w-40 rounded-xs`} />
              </span>
            </span>

            <span className="page-subtitle block">
              <span className={PAGE_SUBTITLE_LINE}>
                <span className={`${BAR} block h-3.5 w-64 rounded-xs`} />
              </span>
            </span>
          </div>
        </header>

        <div className="form-stack">
          <span className={`${BAR} block h-9 w-full rounded-md`} />
          <span className={`${BAR} block h-9 w-full rounded-md`} />
          <span className={`${BAR} block h-24 w-full rounded-md`} />
        </div>
      </div>
    </Container>
  );
}
