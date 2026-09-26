"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Post } from "@my-app/shared";

export interface PostStateValue {
  post: Post;

  updatePost: (updater: (post: Post) => Post) => void;
}

const PostStateContext = createContext<PostStateValue | null>(null);

export function PostStateProvider({
  initialPost,
  children,
}: {
  initialPost: Post;

  children: React.ReactNode;
}) {
  const [post, setPost] = useState<Post>(initialPost);

  const viewIncremented = useRef(false);

  useEffect(() => {
    if (viewIncremented.current) return;
    viewIncremented.current = true;
    setPost((prev) => ({ ...prev, views: prev.views + 1 }));
  }, []);

  const value = useMemo(() => ({ post, updatePost: setPost }), [post]);

  return <PostStateContext.Provider value={value}>{children}</PostStateContext.Provider>;
}

export function usePostState(): PostStateValue {
  const ctx = useContext(PostStateContext);
  if (!ctx) throw new Error("usePostState 必须在 PostStateProvider 内使用");
  return ctx;
}
