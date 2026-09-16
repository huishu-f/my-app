/**
 * @file 评论模块 Hooks
 * @description 基于 commentApi 封装：评论列表查询走 useFetch 三态，
 *              发表/编辑/删除走 useAsyncAction 提交态，内置成功/失败 toast 提示。
 *              无客户端缓存：列表刷新与文章评论计数修正由调用方在回调中处理。
 */
import { useCallback } from 'react';
import toast from '@/lib/toast';
import { useTranslations } from 'next-intl';
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
 * 文章评论列表查询 Hook
 * @param postId 文章 ID（为空字符串时不发请求）
 * @returns 列表数据与三态：data / isLoading / isError / refetch
 * @description 按需拉取 + AbortController 卸载防护；
 *              显式 cacheKey `comments:{postId}`，避免生产 minify 后 key 碰撞
 * @example
 * const { data, refetch } = useComments(postId);
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
 * 发表评论 Hook
 * @param postId 文章 ID
 * @returns useAsyncAction 的提交器与 isPending 状态
 * @description mutate 入参为 CreateCommentDto；内置成功/失败 toast 提示，
 *              列表刷新与评论计数修正由调用方在 onSuccess 回调中处理
 * @example
 * const { mutate: createComment } = useCreateComment(postId);
 * createComment(dto, { onSuccess: () => refetch() });
 */
export function useCreateComment(postId: string) {
  const t = useTranslations('post');
  const action = useCallback((dto: CreateCommentDto) => commentApi.create(postId, dto), [postId]);
  return useAsyncAction<CreateCommentDto, CommentData>(action, {
    onSuccess: () => toast.success(t('commentCreated')),
    onError: () => toast.error(t('commentCreateFailed')),
  });
}

/**
 * 编辑评论 Hook
 * @returns useAsyncAction 的提交器与 isPending 状态
 * @description mutate 入参为 { commentId, dto }（UpdateCommentMutationVars）；
 *              内置成功/失败 toast 提示（错误优先展示后端 message，如 403 非作者），
 *              列表刷新由调用方在 onSuccess 回调中处理
 */
export function useUpdateComment() {
  const t = useTranslations('post');
  const action = useCallback(
    ({ commentId, dto }: UpdateCommentMutationVars) => commentApi.update(commentId, dto),
    [],
  );
  return useAsyncAction<UpdateCommentMutationVars, CommentData>(action, {
    onSuccess: () => toast.success(t('commentUpdated')),
    onError: (err: Error) => {
      // 403 非评论作者等后端错误直接展示其 message
      toast.error(err.message || t('commentUpdateFailed'));
    },
  });
}

/**
 * 删除评论 Hook
 * @returns useAsyncAction 的提交器与 isPending 状态
 * @description mutate 入参为评论 ID；内置成功/失败 toast 提示，
 *              列表刷新与评论计数修正由调用方在 onSuccess 回调中处理
 */
export function useDeleteComment() {
  const t = useTranslations('post');
  const action = useCallback((commentId: string) => commentApi.remove(commentId), []);
  return useAsyncAction<string, null>(action, {
    onSuccess: () => toast.success(t('commentDeleted')),
    onError: (err: Error) => {
      toast.error(err.message || t('commentDeleteFailed'));
    },
  });
}
