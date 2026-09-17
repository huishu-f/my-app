/**
 * @file PostHeadStats.tsx
 * @description 详情页头部统计条：从 PostStateProvider 读取当前文章，展示浏览/点赞/评论数
 */
'use client';

import { Eye, Heart, MessageCircle } from 'lucide-react';
import { formatCount } from '@/lib/format';
import { usePostState } from './PostStateProvider';

/**
 * PostHeadStats 头部统计（无入参，数据来自 PostStateProvider）
 */
export function PostHeadStats() {
  /** 从文章状态上下文读取当前文章（点赞/评论数会随交互实时更新） */
  const { post } = usePostState();

  return (
    <div className="row-md text-muted ml-auto text-(length:--type-xs) leading-normal">
      <span className="row-xs">
        <Eye size={14} strokeWidth={2.5} aria-hidden="true" />
        {formatCount(post.views)}
      </span>
      <span className="meta-dot" />
      <span className="row-xs">
        <Heart size={14} strokeWidth={2.5} aria-hidden="true" />
        {formatCount(post.likes)}
      </span>
      <span className="meta-dot" />
      <span className="row-xs">
        <MessageCircle size={14} strokeWidth={2.5} aria-hidden="true" />
        {post.commentsCount}
      </span>
    </div>
  );
}
