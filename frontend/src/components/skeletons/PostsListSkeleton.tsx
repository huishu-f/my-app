import { Container } from "@/components/ui/Container";
import { BAR, PAGE_SUBTITLE_LINE, PAGE_TITLE_LINE } from "@/components/skeletons/primitives";
import { PostsBodySkeleton } from "@/components/skeletons/PostsBodySkeleton";

export function PostsListSkeleton() {
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
                <span className={`${BAR} block h-3.5 w-72 rounded-xs`} />
              </span>
            </span>
          </div>
        </header>

        <PostsBodySkeleton />
      </div>
    </Container>
  );
}
