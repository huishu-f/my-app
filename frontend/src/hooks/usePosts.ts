"use client";

import { useCallback } from "react";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useAuth } from "@/components/AuthProvider";
import { msg } from "@/lib/message";
import { notify } from "@/lib/toast";
import { unwrap } from "@/lib/actionResult";
import { toggleLikeAction, toggleFavoriteAction } from "@server/blog/blog.controller";
import { createPostAction, updatePostAction, deletePostAction } from "@server/blog/blog.controller";
import type {
  CreatePostDto,
  PostData,
  UpdatePostDto,
  UpdatePostMutationVars,
} from "@my-app/shared";
import type { User } from "@my-app/shared";

const postActions = {
  create: (dto: CreatePostDto) => createPostAction(dto).then(unwrap<PostData>),
  update: (id: string, dto: UpdatePostDto) => updatePostAction(id, dto).then(unwrap<PostData>),
  remove: (id: string) => deletePostAction(id).then(unwrap<null>),
};

export function useCreatePost() {
  const action = useCallback((dto: CreatePostDto) => postActions.create(dto), []);
  return useAsyncAction<CreatePostDto, PostData>(action);
}

export function useUpdatePost() {
  const action = useCallback(
    ({ id, dto }: UpdatePostMutationVars) => postActions.update(id, dto),
    [],
  );
  return useAsyncAction<UpdatePostMutationVars, PostData>(action);
}

export function useDeletePost() {
  const action = useCallback(async (id: string) => {
    await postActions.remove(id);
    return null;
  }, []);
  return useAsyncAction<string, null>(action, {
    onSuccess: () => notify.deleted("post"),
    onError: (err) => notify.error(err),
  });
}

export function useToggleLike() {
  return useTogglePostAssociation(
    (id: string) => toggleLikeAction(id).then(unwrap),
    "likedArticles",
    "liked",
    "like",
  );
}

export function useToggleFavorite() {
  return useTogglePostAssociation(
    (id: string) => toggleFavoriteAction(id).then(unwrap),
    "favoritedArticles",
    "favorited",
    "favorite",
  );
}

function useTogglePostAssociation<TData extends { [K in TKey]: boolean }, TKey extends string>(
  apiFn: (id: string) => Promise<TData>,
  userField: "likedArticles" | "favoritedArticles",
  dataKey: TKey,
  kind: "like" | "favorite",
) {
  const { user, patchMe } = useAuth();

  const action = useCallback(
    async (id: string): Promise<TData> => {
      // ponytail: 先发请求再提示。此前成功 toast 在请求发出前就弹了 ——
      // 失败时用户会先看到一条假的「已点赞」，再看到错误提示。
      const data = await apiFn(id);

      if (user) {
        const prev = new Set(user[userField] ?? []);
        if (data[dataKey]) prev.add(id);
        else prev.delete(id);
        patchMe({ [userField]: Array.from(prev) } as Partial<User>);
      }

      // 用服务端返回的真实状态决定文案，与最终写入的关系表保持一致。
      notify.success(msg("toggle", data[dataKey] ? `${kind}On` : `${kind}Off`));
      return data;
    },
    [user, patchMe, apiFn, userField, dataKey, kind],
  );

  return useAsyncAction<string, TData>(action, {
    onError: (err) => notify.error(err),
  });
}
