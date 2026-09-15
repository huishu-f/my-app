/**
 * @file ViewReporter.tsx
 * @description 浏览量客户端上报组件（fire-and-forget，不渲染任何 UI）。
 *              与 SSR 缓存解耦：详情页静态化后服务端不再每次实取，浏览计数
 *              由真实访问在客户端触发，不影响页面 TTFB 与缓存命中。
 */
'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api/request';

/** 同一页面会话内已上报的文章 ID（防 StrictMode 双计数与快速重挂载重复计数） */
const reported = new Set<string>();
/** 上限：超过后清空全部，防止长会话 Set 无限增长（漏报一两次无害，后端有 rate limit） */
const REPORTED_CAP = 50;

/**
 * ViewReporter 浏览量上报
 * @param props.postId 文章 ID
 */
export function ViewReporter({ postId }: { postId: string }) {
  /**
   * 挂载后上报一次浏览量，已上报过的文章跳过（防 StrictMode 双计数）
   */
  useEffect(() => {
    if (!postId || reported.has(postId)) return;
    reported.add(postId);
    // 防止长会话 Set 无限增长：超过上限时清空（漏报一两次无害）
    if (reported.size > REPORTED_CAP) reported.clear();
    // fire-and-forget：失败静默（浏览计数非关键路径）；keepalive 保证页面卸载后仍送达
    api
      .post<null>(`/posts/${postId}/view`)
      .catch(() => {});
  }, [postId]);
  return null;
}
