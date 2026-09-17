/**
 * @file LazyIslands.tsx
 * @description 详情页延迟加载岛：以 next/dynamic（ssr:false）包装评论区与返回顶部按钮，将其移出服务端渲染路径以减小首屏 bundle
 */
'use client';

import dynamic from 'next/dynamic';
import type { CommentsSectionProps } from '@my-app/shared';

/** 评论区动态导入：ssr:false 关闭服务端渲染，加载中展示占位骨架 */
const CommentsSection = dynamic(() => import('./CommentsSection').then((m) => m.CommentsSection), {
  ssr: false,
  loading: () => <div className="bg-surface mt-8 h-32 animate-pulse rounded-xl" />,
});

/** 返回顶部按钮动态导入：纯客户端交互组件，无需服务端渲染 */
const BackToTop = dynamic(() => import('@/components/BackToTop').then((m) => m.BackToTop), {
  ssr: false,
});

/**
 * 延迟评论区外壳，向评论区透传全部 props
 * @param props {@link CommentsSectionProps}
 */
export function LazyComments(props: CommentsSectionProps) {
  return <CommentsSection {...props} />;
}

/** 延迟返回顶部按钮外壳（无入参） */
export function LazyBackToTop() {
  return <BackToTop />;
}
