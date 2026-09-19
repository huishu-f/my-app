/**
 * @file hooks.ts
 * @description 博客领域的客户端 Hook：文章详情读取与增删改、点赞/收藏切换；读取走 useFetch（SWR 缓存），写操作直接调 @/actions 里的 Server Action，点赞收藏成功后乐观更新本地用户态
 */
import { useCallback } from 'react';
import toast from '@/lib/toast';
import { useTranslations } from 'next-intl';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useFetch } from '@/hooks/useFetch';
import { useAuth } from '@/providers/AuthProvider';
import type { CreatePostDto, PostData, UpdatePostMutationVars } from '@my-app/shared';
import type { User } from '@my-app/shared';
import type { ActionResult } from '@/actions/run';
import { unwrap } from '@/actions/unwrap';
import { createPostAction, updatePostAction, deletePostAction } from '@/actions/post';
import { likePostAction, favoritePostAction } from '@/actions/interaction';
import { blogApi } from '@/services/blog/read';

/**
 * 文章详情读取 Hook，基于 useFetch 带 SWR 缓存与请求去重
 * @param id 文章 ID；为空时禁用请求（loading 恒 false、data 为 null）
 * @returns
 * - `data`      文章 PostData，未加载到时为 null
 * - `isLoading` 是否加载中
 * - `isError`   最近一次请求是否失败
 * @example
 * const { data, isLoading, isError } = usePostData(id);
 */
export function usePostData(id: string) {
  const { data, loading, error } = useFetch<PostData>(
    (signal) => blogApi.getPost(id, { signal }),
    [id],
    !!id,
    `post:${id}`,
  );
  return { data, isLoading: loading, isError: !!error };
}

/**
 * 新建文章 Hook（走 Server Action：变更与缓存失效在同一次往返完成，发布后可立即看到新数据）
 * @returns
 * - `mutate`    执行创建，入参 CreatePostDto；成功返回 PostData，失败返回 undefined
 * - `isPending` 是否有进行中的创建
 */
export function useCreatePost() {
  const action = useCallback((dto: CreatePostDto) => createPostAction(dto).then(unwrap), []);
  return useAsyncAction<CreatePostDto, PostData>(action);
}

/**
 * 更新文章 Hook（走 Server Action，同 useCreatePost）
 * @returns
 * - `mutate`    执行更新，入参 UpdatePostMutationVars（{ id, dto }）；成功返回 PostData，失败返回 undefined
 * - `isPending` 是否有进行中的更新
 */
export function useUpdatePost() {
  const action = useCallback(
    ({ id, dto }: UpdatePostMutationVars) => updatePostAction(id, dto).then(unwrap),
    [],
  );
  return useAsyncAction<UpdatePostMutationVars, PostData>(action);
}

/**
 * 删除文章 Hook，成功后弹出"已删除"提示（走 Server Action：删除的同时失效列表/首页缓存）
 * @returns
 * - `mutate`    执行删除，入参文章 ID；成功返回 null，失败返回 undefined
 * - `isPending` 是否有进行中的删除
 */
export function useDeletePost() {
  const t = useTranslations('post');
  const action = useCallback(
    async (id: string) => {
      await deletePostAction(id).then(unwrap);
      toast.success(t('postDeleted'));
      return null;
    },
    [t],
  );
  return useAsyncAction<string, null>(action);
}

/**
 * 点赞切换 Hook，成功后乐观更新本地用户的 likedArticles
 * @returns 同 useTogglePostAssociation：{ mutate, isPending }，mutate 入参文章 ID
 */
export function useToggleLike() {
  return useTogglePostAssociation(likePostAction, 'likedArticles', 'liked');
}

/**
 * 收藏切换 Hook，成功后乐观更新本地用户的 favoritedArticles
 * @returns 同 useTogglePostAssociation：{ mutate, isPending }，mutate 入参文章 ID
 */
export function useToggleFavorite() {
  return useTogglePostAssociation(favoritePostAction, 'favoritedArticles', 'favorited');
}

/**
 * 点赞/收藏共用的切换逻辑：调用动作后按返回的状态位增删本地用户集合中的该文章 ID（乐观同步）
 * @param mutateFn 具体的切换 Server Action（已承担缓存失效）；直接传模块级函数引用，保证内层 useCallback 依赖稳定
 * @param userField 需要更新的用户字段名（likedArticles 或 favoritedArticles）
 * @param dataKey 响应数据中表示切换后状态的布尔字段名
 * @returns 同 useAsyncAction：{ mutate, isPending }，失败时统一弹出 actionFailed 提示
 * @template TData 含 dataKey 布尔字段的响应数据类型
 * @template TKey 响应中的状态字段名
 */
function useTogglePostAssociation<TData extends { [K in TKey]: boolean }, TKey extends string>(
  mutateFn: (id: string) => Promise<ActionResult<TData>>,
  userField: 'likedArticles' | 'favoritedArticles',
  dataKey: TKey,
) {
  const { user, patchMe } = useAuth();
  const t = useTranslations('common');
  const action = useCallback(
    async (id: string): Promise<TData> => {
      const data = await mutateFn(id).then(unwrap);
      if (user) {
        const prev = new Set(user[userField] ?? []);
        if (data[dataKey]) prev.add(id);
        else prev.delete(id);
        patchMe({ [userField]: Array.from(prev) } as Partial<User>);
      }
      return data;
    },
    [user, patchMe, mutateFn, userField, dataKey],
  );
  return useAsyncAction<string, TData>(action, {
    onError: () => toast.error(t('actionFailed')),
  });
}
