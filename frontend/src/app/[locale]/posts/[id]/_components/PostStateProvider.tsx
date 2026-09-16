/**
 * @file PostStateProvider.tsx
 * @description 文章详情页展示态 Provider：以 React 状态提升方式集中管理文章数据
 *              （点赞/收藏/评论计数）。初始值来自 SSR props，交互后用接口响应本地更新，
 *              全程零额外请求。
 */
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Post } from '@my-app/shared';

/**
 * 文章展示态 Context 值
 */
export interface PostStateValue {
  /** 文章展示数据（SSR 初始 + 交互更新） */
  post: Post;
  /** 局部更新文章展示态（计数修正） */
  updatePost: (updater: (post: Post) => Post) => void;
}

/** 文章展示态 Context 实例 */
const PostStateContext = createContext<PostStateValue | null>(null);

/**
 * PostStateProvider 文章详情页状态 Provider 组件
 * @param props.initialPost SSR 传入的文章数据（初始展示态）
 * @param props.children 子组件树
 */
export function PostStateProvider({
  initialPost,
  children,
}: {
  initialPost: Post;
  children: React.ReactNode;
}) {
  /** 文章展示态，初始值来自 SSR 传入的 initialPost */
  const [post, setPost] = useState<Post>(initialPost);

  /**
   * 浏览量即时修正：ViewReporter 在客户端 fire-and-forget 上报浏览量，
   * SSR 返回的是上报前的旧值。挂载时本地 +1，让用户看到包含本次访问的计数。
   * ref 守卫防止 React StrictMode 开发模式双执行导致 +2。
   */
  const viewIncremented = useRef(false);
  useEffect(() => {
    if (viewIncremented.current) return;
    viewIncremented.current = true;
    setPost((prev) => ({ ...prev, views: prev.views + 1 }));
  }, []);

  /**
   * 局部更新文章展示态（点赞/收藏/评论计数）
   */
  const updatePost = useCallback((updater: (prev: Post) => Post) => {
    setPost(updater);
  }, []);

  /**
   * 组合 Context 值，post 或 updatePost 变化时重建引用
   */
  const value = useMemo(() => ({ post, updatePost }), [post, updatePost]);

  return <PostStateContext.Provider value={value}>{children}</PostStateContext.Provider>;
}

/**
 * usePostState — 读取文章展示态
 * @returns {@link PostStateValue}
 * @throws 在 PostStateProvider 外使用时报错
 */
export function usePostState(): PostStateValue {
  const ctx = useContext(PostStateContext);
  if (!ctx) throw new Error('usePostState 必须在 PostStateProvider 内使用');
  return ctx;
}
