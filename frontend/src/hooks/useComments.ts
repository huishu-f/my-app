"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { notify } from "@/lib/toast";
import { unwrap } from "@/lib/actionResult";
import {
  createCommentAction,
  updateCommentAction,
  deleteCommentAction,
} from "@server/comment/comment.controller";
import { api } from "@/lib/apiRequest";
import type {
  Comment,
  CommentsListData,
  CreateCommentDto,
  UpdateCommentMutationVars,
} from "@my-app/shared";

export const COMMENTS_PAGE_SIZE = 10;

export function useComments(postId: string, pageSize = COMMENTS_PAGE_SIZE) {
  const [data, setData] = useState<CommentsListData | null>(null);
  const [isLoading, setIsLoading] = useState(!!postId);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isError, setIsError] = useState(false);
  const [tick, setTick] = useState(0);

  // 已加载条数即下一页的 offset —— 服务端按 createdAt DESC 稳定排序。
  const loadedRef = useRef(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    const controller = new AbortController();
    setIsLoading(true);
    loadedRef.current = 0;
    api
      .get<CommentsListData>(
        `/posts/${postId}/comments`,
        { limit: pageSize, offset: 0 },
        { signal: controller.signal },
      )
      .then((result) => {
        if (cancelled) return;
        setData(result);
        loadedRef.current = result.comments.length;
        setIsError(false);
      })
      .catch(() => {
        if (!cancelled) setIsError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [postId, tick, pageSize]);

  const loadMore = useCallback(async () => {
    if (!postId || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await api.get<CommentsListData>(`/posts/${postId}/comments`, {
        limit: pageSize,
        offset: loadedRef.current,
      });
      setData((prev) => ({
        comments: [...(prev?.comments ?? []), ...result.comments],
        total: result.total,
        hasMore: result.hasMore,
      }));
      loadedRef.current += result.comments.length;
    } catch (err) {
      notify.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [postId, isLoadingMore, pageSize]);

  /**
   * ponytail: 用服务端返回的真实对象直接落地到本地列表，取代「提交后 refetch」。
   * 原来的 refetch 只递增一个 tick，transition 会在网络请求回来之前结束，
   * useOptimistic 的乐观项被清掉而真实数据还没到 —— 新评论会短暂消失再出现。
   */
  const appendComment = useCallback((comment: Comment) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        comments: [comment, ...prev.comments],
        total: prev.total + 1,
        hasMore: prev.hasMore,
      };
    });
    loadedRef.current += 1;
  }, []);

  const replaceComment = useCallback((comment: Comment) => {
    setData((prev) =>
      prev
        ? { ...prev, comments: prev.comments.map((c) => (c.id === comment.id ? comment : c)) }
        : prev,
    );
  }, []);

  const removeComment = useCallback((commentId: string) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            comments: prev.comments.filter((c) => c.id !== commentId),
            total: Math.max(0, prev.total - 1),
          }
        : prev,
    );
    loadedRef.current = Math.max(0, loadedRef.current - 1);
  }, []);

  return {
    data,
    isLoading,
    isLoadingMore,
    isError,
    refetch,
    loadMore,
    appendComment,
    replaceComment,
    removeComment,
  };
}

export function useCreateComment(postId: string) {
  const action = useCallback(
    async (dto: CreateCommentDto) => {
      const result = await createCommentAction(postId, dto);
      return unwrap<Comment>(result);
    },
    [postId],
  );
  return useAsyncAction<CreateCommentDto, Comment>(action, {
    onSuccess: () => notify.created("comment"),
    onError: (err) => notify.error(err),
  });
}

export function useUpdateComment() {
  const action = useCallback(async ({ commentId, dto }: UpdateCommentMutationVars) => {
    const result = await updateCommentAction(commentId, dto);
    return unwrap<Comment>(result);
  }, []);
  return useAsyncAction<UpdateCommentMutationVars, Comment>(action, {
    onSuccess: () => notify.updated("comment"),
    onError: (err) => notify.error(err),
  });
}

export function useDeleteComment() {
  const action = useCallback(async (commentId: string) => {
    const result = await deleteCommentAction(commentId);
    return unwrap<null>(result);
  }, []);
  return useAsyncAction<string, null>(action, {
    onSuccess: () => notify.deleted("comment"),
    onError: (err) => notify.error(err),
  });
}
