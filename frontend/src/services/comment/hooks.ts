/**
 * @file hooks.ts
 * @description 评论模块 Hooks。基于 commentApi（fetch API）封装，提供评论列表查询及
 *              评论发表/编辑/删除等提交操作，内置成功/失败提示。
 *              无客户端缓存：列表刷新与文章评论计数修正由调用方在回调中处理。
 */
import { useCallback } from 'react';
import toast from '@/lib/toast';
import { useAsyncAction } from '@/lib/use-async-action';
import { useFetch } from '@/lib/use-fetch';
import type {
  CommentData,
  CommentsListData,
  CreateCommentDto,
  UpdateCommentMutationVars,
} from '@my-app/shared';
import { commentApi } from './api';

/**
 * 文章评论列表查询 Hook，按需拉取，AbortController 卸载防护；postId 为空时不发请求
 * @param postId 文章ID
 * @returns 评论列表查询结果（data / isLoading / isError / refetch）
 */
export function useComments(postId: string) {
  const { data, loading, error, refetch } = useFetch<CommentsListData>(
    (signal) => commentApi.list(postId, { signal }),
    [postId],
    !!postId,
    `comments:${postId}`, // 显式 cacheKey，避免 minify 后 toString 碰撞
  );
  return { data, isLoading: loading, isError: !!error, refetch };
}

/**
 * 发表评论 Hook，内置成功/失败提示；列表刷新与评论计数修正由调用方在 onSuccess 回调中处理
 * @param postId 文章ID
 * @param dto 评论表单数据
 * @returns useAsyncAction 提交函数与提交状态
 */
export function useCreateComment(postId: string) {
  const action = useCallback((dto: CreateCommentDto) => commentApi.create(postId, dto), [postId]);
  return useAsyncAction<CreateCommentDto, CommentData>(action, {
    onSuccess: () => toast.success('评论已发表'),
    onError: () => toast.error('发表评论失败'),
  });
}

/**
 * 编辑评论 Hook，内置成功/失败提示；列表刷新由调用方在 onSuccess 回调中处理
 * @param vars 包含评论ID和评论表单数据的变量对象
 * @returns useAsyncAction 提交函数与提交状态
 */
export function useUpdateComment() {
  const action = useCallback(
    ({ commentId, dto }: UpdateCommentMutationVars) => commentApi.update(commentId, dto),
    [],
  );
  return useAsyncAction<UpdateCommentMutationVars, CommentData>(action, {
    onSuccess: () => toast.success('评论已更新'),
    onError: (err: Error) => {
      // 403 非评论作者
      toast.error(err.message || '编辑评论失败');
    },
  });
}

/**
 * 删除评论 Hook，内置成功/失败提示；列表刷新与评论计数修正由调用方在 onSuccess 回调中处理
 * @param commentId 评论ID
 * @returns useAsyncAction 提交函数与提交状态
 */
export function useDeleteComment() {
  const action = useCallback((commentId: string) => commentApi.remove(commentId), []);
  return useAsyncAction<string, null>(action, {
    onSuccess: () => toast.success('评论已删除'),
    onError: (err: Error) => {
      toast.error(err.message || '删除评论失败');
    },
  });
}
