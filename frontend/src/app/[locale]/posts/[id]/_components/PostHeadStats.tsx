/**
 * @file PostHeadStats.tsx
 * @description 文章详情页头部统计条（阅读量/点赞/评论数）。
 *              从 PostStateProvider 读取实时展示态，交互后与正文操作栏计数同步更新。
 */
'use client';

import { Eye, Heart, MessageCircle } from 'lucide-react';
import { formatCount } from '@/lib/format';
import { usePostState } from './PostStateProvider';

/**
 * PostHeadStats 头部统计组件
 * 渲染三个统计项：views（只读）、likes 与 commentsCount（交互后与操作栏同步刷新）
 */
/**
 * PostHeadStats 头部统计组件
 * 渲染三个统计项：views（只读，挂载时本地 +1）、likes 与 commentsCount（交互后同步刷新）
 */
export function PostHeadStats() {
  /** 文章展示态来源 */
  const { post } = usePostState();

  return (
    <div className="meta-stats row-md text-muted ml-auto text-(length:--type-sm) leading-normal">
      {/* 阅读量 */}
      <span className="meta-stat row-xs">
        <Eye size={14} strokeWidth={2.5} />
        {formatCount(post.views)}
      </span>
      <span className="meta-stat-dot meta-dot" />
      {/* 点赞数 */}
      <span className="meta-stat row-xs">
        <Heart size={14} strokeWidth={2.5} />
        {formatCount(post.likes)}
      </span>
      <span className="meta-stat-dot meta-dot" />
      {/* 评论数 */}
      <span className="meta-stat row-xs">
        <MessageCircle size={14} strokeWidth={2.5} />
        {post.commentsCount}
      </span>
    </div>
  );
}