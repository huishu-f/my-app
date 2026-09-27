import { Container } from "@/components/ui/Container";
import { BAR, line, PAGE_TITLE_LINE } from "@/components/skeletons/primitives";

const LABEL_LINE = line("h-[21px]");

const HINT_LINE = line("h-[18px]");

const PREVIEW_LINES = [
  "w-1/2",
  "w-full",
  "w-11/12",
  "w-full",
  "w-3/5",
  "w-full",
  "w-2/3",
  "w-4/5",
  "w-1/3",
];

function Toolbar() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <span key={i} className={`${BAR} size-9 shrink-0 rounded-md`} />
      ))}
    </div>
  );
}

function EditorPane() {
  return (
    <div className="border-stroke-strong bg-card-bg input-focus-within flex flex-col rounded-xl border">
      <div className="border-stroke border-b px-3 py-2">
        <Toolbar />
      </div>
      <div className="min-h-[60vh] flex-1 space-y-3 px-4 py-3">
        {PREVIEW_LINES.map((width, i) => (
          <span key={i} className={`${BAR} block h-3.5 rounded-xs ${width}`} />
        ))}
      </div>
    </div>
  );
}

function PreviewPane() {
  return (
    <div className="border-stroke-strong bg-card-bg min-h-[60vh] overflow-y-auto rounded-xl border p-6">
      <div className="article-content space-y-3">
        {PREVIEW_LINES.map((width, i) => (
          <span key={i} className={`${BAR} block h-4 rounded-xs ${width}`} />
        ))}
      </div>
    </div>
  );
}

function Field({
  labelW = "w-10",
  hintW,
  children,
}: {
  labelW?: string;
  hintW?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-heading block text-(length:--type-xs) leading-normal font-medium tracking-[-0.005em]">
        <span className={LABEL_LINE}>
          <span className={`${BAR} block h-3.5 ${labelW} rounded-xs`} />
        </span>
      </span>

      {children}

      {hintW && (
        <span className="meta-text block">
          <span className={HINT_LINE}>
            <span className={`${BAR} block h-3 ${hintW} rounded-xs`} />
          </span>
        </span>
      )}
    </div>
  );
}

export function WriteSkeleton() {
  return (
    <Container className="page-section">
      <div aria-hidden="true">
        <header className="page-header page-actions">
          <span className="page-title max-md:page-title-mobile block">
            <span className={PAGE_TITLE_LINE}>
              <span className={`${BAR} block h-6 w-32 rounded-xs`} />
            </span>
          </span>

          <div className="segmented lg:hidden">
            <span className="segmented-item segmented-item-on">
              <span className={`${BAR} block size-[21px] rounded-md`} />
            </span>
            <span className="segmented-item">
              <span className={`${BAR} block size-[21px] rounded-md`} />
            </span>
          </div>
        </header>

        <div className="form-stack">
          <div>
            <span className={`${BAR} block h-9 w-full rounded-md`} />
          </div>

          <div>
            <div className="hidden grid-cols-2 gap-4 lg:grid">
              <EditorPane />
              <PreviewPane />
            </div>

            <div className="lg:hidden">
              <Toolbar />

              <span className={`${BAR} mt-2 inline-block h-[570px] w-full rounded-md`} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
            <Field labelW="w-10">
              <span className={`${BAR} block h-9 w-full rounded-md`} />
            </Field>

            <Field labelW="w-10" hintW="w-32">
              <div className="flex flex-wrap gap-2">
                <span className={`${BAR} h-9 w-32 rounded-md`} />
              </div>
            </Field>
          </div>

          <div>
            <Field labelW="w-10" hintW="w-40">
              <span className={`${BAR} block h-24 w-full rounded-md`} />
            </Field>
          </div>

          <Field labelW="w-16" hintW="w-36">
            <div className="row-sm">
              <span className={`${BAR} h-9 flex-1 rounded-md`} />
            </div>
          </Field>

          <div className="row-md border-stroke mt-8 flex-wrap justify-between border-t pt-6">
            <span className={`${BAR} h-3 w-24 rounded-xs`} />

            <div className="row-sm max-md:ml-auto">
              <span className={`${BAR} h-9 w-16 rounded-md`} />
              <span className={`${BAR} h-9 w-24 rounded-md`} />
              <span className={`${BAR} h-9 w-20 rounded-md`} />
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
