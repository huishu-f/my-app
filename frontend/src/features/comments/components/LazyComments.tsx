/**
 * @file LazyComments.tsx
 * @description 评论区的延迟加载外壳：以 next/dynamic（ssr:false）把评论区移出服务端渲染路径，减小详情页首屏 bundle
 *
 * 放在评论域内而不是路由层：它延迟加载的正是本域的 CommentsSection，不产生跨域引用；
 * 页面按需组合它即可，路由目录里不再需要私有组件目录。
 */
'use client';

import dynamic from 'next/dynamic';
import type { CommentsSectionProps } from '@my-app/shared';

/** 评论区动态导入：ssr:false 关闭服务端渲染，加载中展示占位骨架 */
const CommentsSection = dynamic(
  () => import('@/features/comments/components/CommentsSection').then((m) => m.CommentsSection),
  {
    ssr: false,
    loading: () => <div className="bg-surface mt-8 h-32 animate-pulse rounded-xl" />,
  },
);

/**
 * 延迟评论区外壳，向评论区透传全部 props
 * @param props {@link CommentsSectionProps}
 */
export function LazyComments(props: CommentsSectionProps) {
  return <CommentsSection {...props} />;
}
