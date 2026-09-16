/**
 * @file LazyIslands.tsx
 * @description 客户端岛屿懒加载包装器：next/dynamic 的 ssr:false 只能在 Client Component 中使用，
 *              故在本文件集中声明懒加载组件并导出薄包装，供服务端组件按需引用。
 */
'use client';

import dynamic from 'next/dynamic';
import type { CommentsSectionProps } from '@my-app/shared';

/** 评论区 — 动态导入（首屏外加载，带骨架 fallback） */
const CommentsSection = dynamic(() => import('./CommentsSection').then((m) => m.CommentsSection), {
  ssr: false,
  loading: () => <div className="bg-surface mt-8 h-32 animate-pulse rounded-xl" />,
});

/** 返回顶部 — 动态导入（滚动后才需要，无 fallback） */
const BackToTop = dynamic(() => import('@/components/BackToTop').then((m) => m.BackToTop), {
  ssr: false,
});

/**
 * LazyComments 懒加载评论区的包装组件
 * @param props {@link CommentsSectionProps}
 */
export function LazyComments(props: CommentsSectionProps) {
  return <CommentsSection {...props} />;
}

/**
 * LazyBackToTop 懒加载返回顶部的包装组件
 */
export function LazyBackToTop() {
  return <BackToTop />;
}
