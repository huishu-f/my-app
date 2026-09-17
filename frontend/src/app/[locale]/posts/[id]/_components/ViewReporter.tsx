/**
 * @file ViewReporter.tsx
 * @description 详情页浏览量上报器（渲染为 null）：客户端挂载时向后端记录一次文章浏览，按 postId 去重且设置上报集合上限
 */
'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api/request';

/** 已上报过浏览量的 postId 集合，用于同会话内去重（不随组件卸载清空） */
const reported = new Set<string>();

/** 去重集合容量上限；达到后淘汰最旧一条（Set 迭代序即插入序），不再整体清空 */
const REPORTED_CAP = 50;

/**
 * ViewReporter 浏览量上报
 * @param props.postId 需要上报浏览量的文章 id
 */
export function ViewReporter({ postId }: { postId: string }) {
  /**
   * 监听 postId：变化时上报一次浏览，已在 reported 中则跳过避免重复计数；
   * 请求失败静默吞掉（浏览统计不影响主流程）。
   * 容量淘汰发生在 add 之前——旧实现 add 后 size>50 再 clear 会把刚加入的 id
   * 一并抹掉，第 51 篇起去重集合归零、同会话内浏览量重复上报。
   */
  useEffect(() => {
    if (!postId || reported.has(postId)) return;

    if (reported.size >= REPORTED_CAP) {
      const oldest = reported.values().next().value;
      if (oldest !== undefined) reported.delete(oldest);
    }
    reported.add(postId);

    api.post<null>(`/posts/${postId}/view`).catch(() => {});
  }, [postId]);
  return null;
}
