/**
 * @file api.ts
 * @description 评论领域接口集合：按文章列举、新增、编辑与删除评论；统一走 api 请求层，业务失败或网络异常抛 ApiRequestError
 */
import { api } from '@/lib/api/request';
import type { CommentData, CommentsListData, CreateCommentDto } from '@my-app/shared';

/** 评论相关接口集合；list 公开，create/update/remove 依赖登录态与权限 */
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

  /**
   * 为指定文章新增评论（需登录）
   * @param postId 文章 ID
   * @param dto 评论内容（当前仅支持 content，无嵌套回复）
   * @returns 新建的 CommentData
   * @throws 未登录、内容校验失败或网络异常时抛 ApiRequestError
   */
  create: (postId: string, dto: CreateCommentDto) =>
    api.post<CommentData>(`/posts/${postId}/comments`, dto),

  /**
   * 编辑已有评论（需登录且有权限）
   * @param commentId 评论 ID
   * @param dto 修改后的评论内容
   * @returns 更新后的 CommentData
   * @throws 无权限、内容校验失败或网络异常时抛 ApiRequestError
   */
  update: (commentId: string, dto: CreateCommentDto) =>
    api.put<CommentData>(`/comments/${commentId}`, dto),

  /**
   * 删除评论（需登录且有权限）
   * @param commentId 评论 ID
   * @returns 成功无返回体（null）
   * @throws 无权限或网络异常时抛 ApiRequestError
   */
  remove: (commentId: string) => api.delete<null>(`/comments/${commentId}`),
};
