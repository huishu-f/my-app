import { Container } from "@/components/ui/Container";
import { BAR, PAGE_SUBTITLE_LINE, PAGE_TITLE_LINE } from "@/components/skeletons/primitives";

const LABEL_BOX = "flex h-[21px] items-center";

const HINT_BOX = "flex h-[18px] items-center";

function Label({ w = "w-14" }: { w?: string }) {
  return (
    <span className={LABEL_BOX}>
      <span className={`${BAR} block h-3.5 ${w} rounded-xs`} />
    </span>
  );
}

function Hint({ w = "w-24", className = "" }: { w?: string; className?: string }) {
  return (
    <span className={`${HINT_BOX} ${className}`}>
      <span className={`${BAR} block h-3 ${w} rounded-xs`} />
    </span>
  );
}

function Field({ labelW = "w-14", hintW }: { labelW?: string; hintW?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label w={labelW} />
      <span className={`${BAR} block h-9 w-full rounded-md`} />
      {hintW && <Hint w={hintW} />}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <Container className="page-section">
      <div aria-hidden="true">
        <header className="page-header">
          <div>
            <span className="page-title max-md:page-title-mobile block">
              <span className={PAGE_TITLE_LINE}>
                <span className={`${BAR} block h-6 w-32 rounded-xs`} />
              </span>
            </span>

            <span className="page-subtitle block">
              <span className={PAGE_SUBTITLE_LINE}>
                <span className={`${BAR} block h-3.5 w-56 rounded-xs`} />
              </span>
            </span>
          </div>
        </header>

        <div className="segmented mb-8">
          <span className="segmented-item segmented-item-on">
            <span className={`${BAR} block h-[21px] w-14 rounded-xs`} />
          </span>
          <span className="segmented-item">
            <span className={`${BAR} block h-[21px] w-14 rounded-xs`} />
          </span>
        </div>

        <div className="form-stack">
          <div className="flex items-center gap-8">
            <span className={`${BAR} h-10 w-10 shrink-0 rounded-full`} />
            <div className="min-w-0 flex-1">
              <Field labelW="w-14" hintW="w-26" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field labelW="w-6" />
            <Field labelW="w-6" />
          </div>

          <div className="flex flex-col gap-2">
            <Label w="w-14" />

            <span className={`${BAR} block h-[122px] w-full rounded-md`} />

            <Hint w="w-12" className="mt-1 justify-end" />
            <Hint w="w-19" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field labelW="w-11" hintW="w-6" />
            <Field labelW="w-14" hintW="w-6" />
          </div>

          <div className="flex justify-end pt-4">
            <span className={`${BAR} h-9 w-[108px] rounded-md`} />
          </div>
        </div>
      </div>
    </Container>
  );
}
