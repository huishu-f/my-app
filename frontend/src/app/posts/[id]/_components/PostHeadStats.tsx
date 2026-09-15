/**
 * @file PostHeadStats.tsx
 * @description 文章详情页头部 meta 统计（阅读量/点赞/评论）。
 *              从 PostStateProvider 读取实时展示态，点赞/收藏/评论交互后
 *              与正文操作栏计数同步更新，避免 SSR 静态值与客户端状态不一致。
 */
'use client';

import { Eye, Heart, MessageCircle } from 'lucide-react';
import { formatCount } from '@/lib/format';
import { usePostState } from './PostStateProvider';

/**
 * PostHeadStats 头部统计，渲染阅读量、点赞数、评论数三个统计项；
 * views 为只读（浏览上报），likes/favorites/commentsCount 从 PostStateProvider 读取，交互后与操作栏同步刷新
 */
export function PostHeadStats() {
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