/**
 * @file api.ts
 * @description 博客模块 API 层。对齐后端 API.md，前缀 /api，
 *              提供文章 CRUD、点赞/收藏、分类/标签、站点配置等接口调用。
 *              读取型接口分两类：
 *              - 公开内容（仅已发布、无个性化）：Data Cache（revalidate + tags）+ skipAuth，
 *                不触发 cookies() 动态 API，页面可静态渲染/ISR；写操作通过 revalidateTag 即时失效。
 *              - 鉴权感知（草稿/私有）：不缓存，避免带 Cookie 响应进入共享缓存。
 */
import { cache } from 'react';
import { api } from '@/lib/api/request';
import type {
  CategoriesData,
  ConfigData,
  CreatePostDto,
  FavoriteToggleData,
  FavoritesData,
  LikeData,
  NeighborPostsData,
  PostData,
  PostListParams,
  PostsListData,
  SiteConfig,
  TagsData,
  UpdatePostDto,
} from '@my-app/shared';

/** 内容缓存标签：列表/详情共用失效粒度（写操作 revalidateTag('posts')） */
const POSTS_TAG = 'posts';
/** 分类缓存标签（独立，避免文章变更时连带重建分类缓存） */
const CATEGORIES_TAG = 'categories';
/** 标签缓存标签（独立，避免文章变更时连带重建标签缓存） */
const TAGS_TAG = 'tags';
/** 站点配置缓存标签（更新配置时失效） */
const CONFIG_TAG = 'config';

/**
 * 博客模块 API 集合
 */
export const blogApi = {
  /**
   * 文章列表（仅已发布内容，无个性化数据），服务端 fetch 不转发 Cookie（skipAuth）→ 不触发 cookies() 动态 API；
   * Data Cache 60s + posts 标签；发布/更新/删除后由 API 路由 revalidateTag 即时失效
   */
  listPosts: (params: PostListParams = {}) =>
    api.get<PostsListData>('/posts', params as Record<string, string | number>, {
      revalidate: 60,
      tags: [POSTS_TAG],
      skipAuth: true,
    }),

  /**
   * 文章详情（鉴权感知，不缓存），草稿预览/作者判权专用慢路径：转发 Cookie，不进入 Data Cache，
   * 避免带 Cookie 的响应被共享缓存跨用户复用
   * @param id 文章ID
   * @param opts 可选中止信号（客户端 hook 卸载防护）
   */
  getPost: (id: string, opts?: { signal?: AbortSignal }) =>
    api.get<PostData>(`/posts/${id}`, undefined, opts),

  /**
   * 文章详情（公开视图，可缓存），仅已发布文章可见（草稿对匿名视角 404）；skipAuth + Data Cache 60s
   * + posts/post:id 双标签，发布/更新/删除后按需失效；详情页快路径专用，草稿由 getPost 慢路径兑底
   * @param id 文章ID
   */
  getPublicPost: (id: string) =>
    api.get<PostData>(`/posts/${id}`, undefined, {
      revalidate: 60,
      tags: [POSTS_TAG, `post:${id}`],
      skipAuth: true,
    }),

  /**
   * 获取相邻文章（上一篇/下一篇），仅已发布文章，公开可缓存
   * @param id 文章ID
   */
  getNeighborPosts: (id: string) =>
    api.get<NeighborPostsData>(`/posts/${id}/neighbors`, undefined, {
      revalidate: 60,
      tags: [POSTS_TAG],
      skipAuth: true,
    }),

  /** 创建文章，authGuard @param dto 创建文章表单数据 */
  createPost: (dto: CreatePostDto) => api.post<PostData>('/posts', dto),

  /** 更新文章，authGuard，仅作者 @param id 文章ID @param dto 更新文章表单数据 */
  updatePost: (id: string, dto: UpdatePostDto) => api.put<PostData>(`/posts/${id}`, dto),

  /** 删除文章，authGuard，仅作者，级联删除评论、清理点赞/收藏 @param id 文章ID */
  deletePost: (id: string) => api.delete<null>(`/posts/${id}`),

  /** 切换点赞（toggle），authGuard，草稿不可点赞 @param id 文章ID */
  toggleLike: (id: string) => api.post<LikeData>(`/posts/${id}/like`),

  /** 切换收藏（toggle），authGuard，草稿不可收藏 @param id 文章ID */
  toggleFavorite: (id: string) => api.post<FavoriteToggleData>(`/posts/${id}/favorite`),

  /** 当前用户收藏列表，authGuard（用户私有数据，不缓存） */
  listFavorites: () => api.get<FavoritesData>('/favorites'),

  /** 分类列表（从已发布文章聚合，公开可缓存，force-cache 避免周期性重验证） */
  listCategories: () =>
    api.get<CategoriesData>('/categories', undefined, {
      cache: 'force-cache',
      tags: [CATEGORIES_TAG],
      skipAuth: true,
    }),

  /** 标签列表（从已发布文章聚合，小写去重排序，公开可缓存，force-cache） */
  listTags: () =>
    api.get<TagsData>('/tags', undefined, {
      cache: 'force-cache',
      tags: [TAGS_TAG],
      skipAuth: true,
    }),

  /** 站点配置（公开可缓存，force-cache 避免稳定数据周期性重验证） */
  getConfig: () =>
    api.get<ConfigData>('/config', undefined, {
      cache: 'force-cache',
      tags: [CONFIG_TAG],
      skipAuth: true,
    }),

  /** 更新站点配置，authGuard @param dto 站点配置更新数据 */
  updateConfig: (dto: Partial<SiteConfig>) => api.put<ConfigData>('/config', dto),
};

/**
 * 请求内去重的公开文章详情 — generateMetadata 与页面组件共享同一次公开请求。
 * 公开视图可进 Data Cache（60s + 双标签），草稿对该视角 404。
 */
export const getCachedPublicPost = cache((id: string) => blogApi.getPublicPost(id));
