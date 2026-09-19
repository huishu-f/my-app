/**
 * @file hooks.ts
 * @description 评论领域的客户端 Hook：评论列表读取（useFetch）与新增/编辑/删除（直接调 @/actions 的 Server Action）；增删改成功或失败时通过 toast 反馈
 *
 * 增删改走 Server Action（`@/actions/comment`），列表读取走 HTTP（`./read`）；
 * 前者带缓存失效语义，所以评论提交后列表卡片与详情页的评论数会同步更新。
 */
import { useCallback } from 'react';
import toast from '@/lib/toast';
import { useTranslations } from 'next-intl';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useFetch } from '@/hooks/useFetch';
import type {
  CommentData,
  CommentsListData,
  CreateCommentDto,
  UpdateCommentMutationVars,
} from '@my-app/shared';
import { unwrap } from '@/actions/unwrap';
import { createCommentAction, updateCommentAction, deleteCommentAction } from '@/actions/comment';
import { commentApi } from '@/services/comment/read';

/**
 * 评论列表读取 Hook，基于 useFetch 带 SWR 缓存与请求去重
 * @param postId 文章 ID；为空时禁用请求
 * @returns
 * - `data`      评论列表 CommentsListData，未加载到时为 null
 * - `isLoading` 是否加载中
 * - `isError`   最近一次请求是否失败
 * - `refetch`   手动重新拉取评论
 */
export function useComments(postId: string) {
  const { data, loading, error, refetch } = useFetch<CommentsListData>(
    (signal) => commentApi.list(postId, { signal }),
    [postId],
    !!postId,
    `comments:${postId}`,
  );
  return { data, isLoading: loading, isError: !!error, refetch };
}

/**
 * 新增评论 Hook，成功/失败均通过 toast 提示
 * @param postId 所属文章 ID
 * @returns
 * - `mutate`    执行新增，入参 CreateCommentDto；成功返回 CommentData，失败返回 undefined
 * - `isPending` 是否有进行中的新增
 */
export function useCreateComment(postId: string) {
  const t = useTranslations('post');
  const action = useCallback(
    (dto: CreateCommentDto) => createCommentAction(postId, dto).then(unwrap),
    [postId],
  );
  return useAsyncAction<CreateCommentDto, CommentData>(action, {
    onSuccess: () => toast.success(t('commentCreated')),
    onError: () => toast.error(t('commentCreateFailed')),
  });
}

/**
 * 编辑评论 Hook，成功提示更新成功，失败优先展示后端错误信息
 * @returns
 * - `mutate`    执行更新，入参 UpdateCommentMutationVars（{ commentId, dto }）；成功返回 CommentData，失败返回 undefined
 * - `isPending` 是否有进行中的更新
 */
export function useUpdateComment() {
  const t = useTranslations('post');
  const action = useCallback(
    ({ commentId, dto }: UpdateCommentMutationVars) =>
      updateCommentAction(commentId, dto).then(unwrap),
    [],
  );
  return useAsyncAction<UpdateCommentMutationVars, CommentData>(action, {
    onSuccess: () => toast.success(t('commentUpdated')),
    onError: (err: Error) => {
      // 优先展示后端返回的具体错误信息，为空时回退到通用兜底文案
      toast.error(err.message || t('commentUpdateFailed'));
    },
  });
}

/**
 * 删除评论 Hook，成功提示删除成功，失败优先展示后端错误信息
 * @returns
 * - `mutate`    执行删除，入参评论 ID；成功返回 null，失败返回 undefined
 * - `isPending` 是否有进行中的删除
 */
export function useDeleteComment() {
  const t = useTranslations('post');
  const action = useCallback(
    (commentId: string) => deleteCommentAction(commentId).then(unwrap),
    [],
  );
  return useAsyncAction<string, null>(action, {
    onSuccess: () => toast.success(t('commentDeleted')),
    onError: (err: Error) => {
      toast.error(err.message || t('commentDeleteFailed'));
    },
  });
}
