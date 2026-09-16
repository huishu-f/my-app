/**
 * @file 评论模块 API 层
 * @description 评论接口封装：列表/发表走 /posts/:postId/comments，
 *              编辑/删除走 /comments/:id（对齐后端 API.md）。
 */
import { api } from '@/lib/api/request';
import type { CommentData, CommentsListData, CreateCommentDto } from '@my-app/shared';

/**
 * 评论模块 API 集合
 * @description 所有方法返回后端响应的 data 部分，错误统一抛 ApiRequestError
 */
export const commentApi = {
  /**
   * 获取指定文章的评论列表
   * @param postId 文章 ID
   * @param opts 可选配置（signal 中止信号，组件卸载防护）
   * @returns 评论列表
   * @description optional 鉴权：携带 Cookie 时后端返回针对当前用户的互动状态
   */
  list: (postId: string, opts?: { signal?: AbortSignal }) =>
    api.get<CommentsListData>(`/posts/${postId}/comments`, undefined, opts),

  /**
   * 发表评论
   * @param postId 文章 ID
   * @param dto 评论表单数据
   * @returns 新建的评论
   * @description 需登录（authGuard）；后端同时递增文章 commentsCount
   */
  create: (postId: string, dto: CreateCommentDto) =>
    api.post<CommentData>(`/posts/${postId}/comments`, dto),

  /**
   * 编辑评论
   * @param commentId 评论 ID
   * @param dto 评论表单数据
   * @returns 更新后的评论
   * @description 需登录且仅评论作者可操作
   */
  update: (commentId: string, dto: CreateCommentDto) =>
    api.put<CommentData>(`/comments/${commentId}`, dto),

  /**
   * 删除评论
   * @param commentId 评论 ID
   * @returns 无 data
   * @description 需登录且仅评论作者可操作；后端同时递减文章 commentsCount
   */
  remove: (commentId: string) => api.delete<null>(`/comments/${commentId}`),
};
