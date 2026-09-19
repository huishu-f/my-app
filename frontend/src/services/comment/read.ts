/**
 * @file read.ts
 * @description 评论领域客户端**读**接口集合：按文章列举评论；失败统一抛 ApiRequestError
 *
 * 评论的增、改、删不在此处：它们由 Server Action 承担（见 `@/actions/comment`），
 * 因为评论数展示在列表卡片与详情页，只有 Action 内的重验证才能同时清掉服务端缓存与浏览器 Client Cache。
 */
import { api } from '@/lib/request';
import type { CommentsListData } from '@my-app/shared';

/** 评论相关读接口集合 */
export const commentApi = {
  /**
   * 获取指定文章的评论列表
   * @param postId 文章 ID
   * @param opts.signal 外部取消信号，组件卸载或切换时可中断请求
   * @returns CommentsListData；无评论时列表为空数组
   * @throws 网络或后端异常时抛 ApiRequestError
   */
  list: (postId: string, opts?: { signal?: AbortSignal }) =>
    api.get<CommentsListData>(`/posts/${postId}/comments`, undefined, opts),
};
