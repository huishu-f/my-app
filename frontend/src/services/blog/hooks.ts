/**
 * @file 博客模块 Hooks
 * @description 文章详情查询（编辑器预填）基于 useFetch 封装 data / loading / error 三态；
 *              CRUD、点赞、收藏等写操作基于 useAsyncAction 管理提交态。
 *              公开列表/分类/标签等由 RSC 直取（Data Cache），客户端不重复查询；
 *              详情页展示态由 PostStateProvider 状态提升（见 _components）。
 */
import { useCallback } from 'react';
import toast from '@/lib/toast';
import { useTranslations } from 'next-intl';
import { useAsyncAction } from '@/lib/use-async-action';
import { useFetch } from '@/lib/use-fetch';
import { useAuth } from '@/components/auth-provider';
import type {
  CreatePostDto,
  PostData,
  UpdatePostMutationVars,
} from '@my-app/shared';
import type { User } from '@my-app/shared';
import { blogApi } from './api';

/**
 * 文章详情查询 Hook（编辑器预填专用）
 * @param id 文章 ID（编辑模式来自 URL 参数；为空字符串时不发请求）
 * @returns data / isLoading / isError 三态
 * @description 客户端按需拉取，AbortController 卸载防护；
 *              显式 cacheKey `post:{id}`，避免生产 minify 后 key 碰撞
 * @example
 * const { data, isLoading } = usePostData(postId);
 */
export function usePostData(id: string) {
  const { data, loading, error } = useFetch<PostData>(
    (signal) => blogApi.getPost(id, { signal }),
    [id],
    !!id,
    `post:${id}`, // 显式 cacheKey，避免 minify 后 toString 碰撞
  );
  return { data, isLoading: loading, isError: !!error };
}

/**
 * 创建文章 Hook
 * @returns useAsyncAction 的提交器与 isPending 状态
 * @description mutate 入参为 CreatePostDto；成功提示与跳转交由调用方处理（区分草稿/发布文案）
 * @example
 * const { mutate: createPost, isPending } = useCreatePost();
 * createPost(dto, { onSuccess: (post) => router.push(`/posts/${post.id}`) });
 */
export function useCreatePost() {
  const action = useCallback((dto: CreatePostDto) => blogApi.createPost(dto), []);
  return useAsyncAction<CreatePostDto, PostData>(action);
}

/**
 * 更新文章 Hook
 * @returns useAsyncAction 的提交器与 isPending 状态
 * @description mutate 入参为 { id, dto }（UpdatePostMutationVars）
 */
export function useUpdatePost() {
  const action = useCallback(
    ({ id, dto }: UpdatePostMutationVars) => blogApi.updatePost(id, dto),
    [],
  );
  return useAsyncAction<UpdatePostMutationVars, PostData>(action);
}

/**
 * 删除文章 Hook
 * @returns useAsyncAction 的提交器与 isPending 状态
 * @description mutate 入参为文章 ID；删除成功后统一 toast 提示，页面跳转交由调用方处理
 */
export function useDeletePost() {
  const t = useTranslations('post');
  const action = useCallback(
    async (id: string) => {
      await blogApi.deletePost(id);
      toast.success(t('postDeleted'));
      return null;
    },
    [t],
  );
  return useAsyncAction<string, null>(action);
}

/**
 * 切换点赞 Hook
 * @returns useAsyncAction 的提交器与 isPending 状态
 * @description mutate 入参为文章 ID；成功后本地修正 me.likedArticles 集合（零请求同步图标状态）；
 *              点赞计数更新由调用方在 onSuccess 中用响应数据 { liked, likes } 处理
 */
export function useToggleLike() {
  return useTogglePostAssociation(
    blogApi.toggleLike,
    'likedArticles',
    'liked',
  );
}

/**
 * 切换收藏 Hook
 * @returns useAsyncAction 的提交器与 isPending 状态
 * @description mutate 入参为文章 ID；成功后本地修正 me.favoritedArticles 集合（零请求同步图标状态）；
 *              收藏计数更新由调用方在 onSuccess 中用响应数据 { favorited, favorites } 处理
 */
export function useToggleFavorite() {
  return useTogglePostAssociation(
    blogApi.toggleFavorite,
    'favoritedArticles',
    'favorited',
  );
}

/**
 * 点赞/收藏 toggle 通用 Hook
 * @param apiFn API 调用函数（toggleLike / toggleFavorite）
 * @param userField User 上的关联字段名（'likedArticles' | 'favoritedArticles'）
 * @param dataKey 响应数据中的布尔标记字段名（'liked' | 'favorited'）
 * @returns useAsyncAction 的提交器与 isPending 状态
 * @description useToggleLike 与 useToggleFavorite 的公共逻辑抽象：
 *              调用 API → 按响应布尔标记本地修正 user 的关联集合（zero-request 同步图标状态）；
 *              失败时统一 toast 提示
 */
function useTogglePostAssociation<TData extends { [K in TKey]: boolean }, TKey extends string>(
  apiFn: (id: string) => Promise<TData>,
  userField: 'likedArticles' | 'favoritedArticles',
  dataKey: TKey,
) {
  const { user, patchMe } = useAuth();
  const t = useTranslations('common');
  const action = useCallback(
    async (id: string): Promise<TData> => {
      const data = await apiFn(id);
      if (user) {
        const prev = new Set(user[userField] ?? []);
        if (data[dataKey]) prev.add(id);
        else prev.delete(id);
        patchMe({ [userField]: Array.from(prev) } as Partial<User>);
      }
      return data;
    },
    [user, patchMe, apiFn, userField, dataKey],
  );
  return useAsyncAction<string, TData>(action, {
    onError: () => toast.error(t('actionFailed')),
  });
}
