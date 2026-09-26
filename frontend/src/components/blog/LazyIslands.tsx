"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { CommentsSectionProps } from "@my-app/shared";
import { CommentsSkeleton } from "@/components/skeletons/CommentsSkeleton";

const CommentsSection = dynamic(() => import("./CommentsSection").then((m) => m.CommentsSection), {
  ssr: false,

  loading: () => <CommentsSkeleton />,
});

const BackToTop = dynamic(() => import("@/components/blog/BackToTop").then((m) => m.BackToTop), {
  ssr: false,
});

/**
 * ponytail: `ssr: false` 只解决「不参与服务端渲染」，组件在 hydration 之后仍会立即挂载，
 * useComments 随即打出 GET /api/posts/[id]/comments。这里用 IntersectionObserver 把挂载
 * 真正推迟到接近视口，让文章页不再必然产生这次请求（评论本就排在瀑布流最后）。
 */
export function LazyComments(props: CommentsSectionProps) {
  const anchorRef = useRef<HTMLDivElement>(null);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el || visible) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return <div ref={anchorRef}>{visible ? <CommentsSection {...props} /> : <CommentsSkeleton />}</div>;
}

export function LazyBackToTop() {
  return <BackToTop />;
}
