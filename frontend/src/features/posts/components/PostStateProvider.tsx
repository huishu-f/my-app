/**
 * @file PostStateProvider.tsx
 * @description 详情页文章状态上下文：以 provider 承载当前文章数据并暴露 updatePost，供统计/点赞/评论等子组件共享同一份可变文章状态
 */
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Post } from '@my-app/shared';

/**
 * PostStateProvider 暴露给消费方的上下文值
 */
export interface PostStateValue {
  /** 当前文章数据（浏览/点赞/评论数会随交互更新） */
  post: Post;

  /** 以函数式更新器修改当前文章，避免闭包读到过期值 */
  updatePost: (updater: (post: Post) => Post) => void;
}

/** 文章状态上下文实例，未包裹 Provider 时为 null */
const PostStateContext = createContext<PostStateValue | null>(null);

/**
 * PostStateProvider 文章状态提供者
 * @param props 组件入参，字段含义见内联类型
 */
export function PostStateProvider({
  initialPost,
  children,
}: {
  /** 服务端获取到的初始文章数据 */
  initialPost: Post;
  /** 订阅该文章状态的子组件 */
  children: React.ReactNode;
}) {
  /** 当前文章数据，初始化自 initialPost */
  const [post, setPost] = useState<Post>(initialPost);

  /** 标记浏览量是否已自增，防止 StrictMode/重渲染下重复 +1 */
  const viewIncremented = useRef(false);
  /**
   * 挂载时执行一次：对当前文章浏览数乐观 +1，使头部统计即时反映本次访问
   */
  useEffect(() => {
    if (viewIncremented.current) return;
    viewIncremented.current = true;
    setPost((prev) => ({ ...prev, views: prev.views + 1 }));
  }, []);

  /** 稳定引用的更新函数，封装 setPost 供子组件修改文章 */
  const updatePost = useCallback((updater: (prev: Post) => Post) => {
    setPost(updater);
  }, []);

  /** 缓存上下文值，仅当 post 或 updatePost 变化时重建，减少子组件无谓重渲染 */
  const value = useMemo(() => ({ post, updatePost }), [post, updatePost]);

  return <PostStateContext.Provider value={value}>{children}</PostStateContext.Provider>;
}

/**
 * 读取详情页文章状态的 Hook
 * @returns {@link PostStateValue} post 与 updatePost
 * @throws 在 PostStateProvider 之外调用时抛错
 * @example
 * const { post, updatePost } = usePostState();
 */
export function usePostState(): PostStateValue {
  const ctx = useContext(PostStateContext);
  if (!ctx) throw new Error('usePostState 必须在 PostStateProvider 内使用');
  return ctx;
}
