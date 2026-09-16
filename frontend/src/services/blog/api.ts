/**
 * @file 博客模块 API 层
 * @description 前缀 /api 的博客接口封装：文章 CRUD、点赞/收藏、分类/标签、站点配置。
 *              读取型接口分两类：
 *              - 公开内容（仅已发布、无个性化）：Data Cache（revalidate + tags）+ skipAuth，
 *                不触发 cookies() 动态 API，页面可静态渲染/ISR；写操作通过 revalidateTag 即时失效
 *              - 鉴权感知（草稿/私有数据）：不缓存，避免带 Cookie 的响应进入共享缓存
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

/** 内容缓存标签：列表/详情共用的失效粒度（写操作 revalidateTag('posts')） */
const POSTS_TAG = 'posts';
/** 分类缓存标签（独立，避免文章变更时连带重建分类缓存） */
const CATEGORIES_TAG = 'categories';
/** 标签缓存标签（独立，避免文章变更时连带重建标签缓存） */
const TAGS_TAG = 'tags';
/** 站点配置缓存标签（更新配置时失效） */
const CONFIG_TAG = 'config';

/**
 * 博客模块 API 集合
 * @description 所有方法返回后端响应的 data 部分，错误统一抛 ApiRequestError
 */
export const blogApi = {
  /**
   * 文章列表（公开视图）
   * @param params 列表查询参数（分页、分类、标签、关键词）
   * @returns 分页文章列表
   * @description 仅已发布内容、无个性化数据；skipAuth 不触发 cookies()，
   *              Data Cache 60s + posts 标签，发布/更新/删除后由 API 路由 revalidateTag 即时失效
   */
  listPosts: (params: PostListParams = {}) =>
    api.get<PostsListData>('/posts', params as Record<string, string | number>, {
      revalidate: 60,
      tags: [POSTS_TAG],
      skipAuth: true,
    }),

  /**
   * 文章详情（鉴权感知，不缓存）
   * @param id 文章 ID
   * @param opts 可选配置（signal 中止信号，客户端 hook 卸载防护）
   * @returns 文章详情
   * @description 草稿预览/作者判权专用的慢路径：转发 Cookie，不进入 Data Cache，
   *              避免带 Cookie 的响应被共享缓存跨用户复用
   */
  getPost: (id: string, opts?: { signal?: AbortSignal }) =>
    api.get<PostData>(`/posts/${id}`, undefined, opts),

  /**
   * 文章详情（公开视图，可缓存）
   * @param id 文章 ID
   * @returns 文章详情
   * @description 详情页快路径专用：仅已发布文章可见（草稿对匿名视角 404），
   *              skipAuth + Data Cache 60s + posts / post:id 双标签，写操作后按需失效；
   *              草稿场景由 getPost 慢路径兜底
   */
  getPublicPost: (id: string) =>
    api.get<PostData>(`/posts/${id}`, undefined, {
      revalidate: 60,
      tags: [POSTS_TAG, `post:${id}`],
      skipAuth: true,
    }),

  /**
   * 获取相邻文章（上一篇/下一篇）
   * @param id 当前文章 ID
   * @returns 相邻文章信息（可能为 null）
   * @description 仅已发布文章的公开可缓存数据，60s 重验证
   */
  getNeighborPosts: (id: string) =>
    api.get<NeighborPostsData>(`/posts/${id}/neighbors`, undefined, {
      revalidate: 60,
      tags: [POSTS_TAG],
      skipAuth: true,
    }),

  /**
   * 创建文章
   * @param dto 创建文章表单数据
   * @returns 新建的文章详情
   * @description 需登录（authGuard）
   */
  createPost: (dto: CreatePostDto) => api.post<PostData>('/posts', dto),

  /**
   * 更新文章
   * @param id 文章 ID
   * @param dto 更新文章表单数据
   * @returns 更新后的文章详情
   * @description 需登录且仅作者可操作（authGuard）
   */
  updatePost: (id: string, dto: UpdatePostDto) => api.put<PostData>(`/posts/${id}`, dto),

  /**
   * 删除文章
   * @param id 文章 ID
   * @returns 无 data
   * @description 需登录且仅作者可操作；级联删除评论、清理点赞/收藏
   */
  deletePost: (id: string) => api.delete<null>(`/posts/${id}`),

  /**
   * 切换点赞（toggle）
   * @param id 文章 ID
   * @returns 最新点赞状态 { liked, likes }
   * @description 需登录；草稿不可点赞
   */
  toggleLike: (id: string) => api.post<LikeData>(`/posts/${id}/like`),

  /**
   * 切换收藏（toggle）
   * @param id 文章 ID
   * @returns 最新收藏状态 { favorited, favorites }
   * @description 需登录；草稿不可收藏
   */
  toggleFavorite: (id: string) => api.post<FavoriteToggleData>(`/posts/${id}/favorite`),

  /**
   * 当前用户收藏列表
   * @returns 收藏的文章列表
   * @description 需登录；用户私有数据，不缓存
   */
  listFavorites: () => api.get<FavoritesData>('/favorites'),

  /**
   * 分类列表
   * @returns 从已发布文章聚合的分类
   * @description 公开可缓存，force-cache + categories 标签（稳定数据不做周期性重验证）
   */
  listCategories: () =>
    api.get<CategoriesData>('/categories', undefined, {
      cache: 'force-cache',
      tags: [CATEGORIES_TAG],
      skipAuth: true,
    }),

  /**
   * 标签列表
   * @returns 从已发布文章聚合的标签（小写去重排序）
   * @description 公开可缓存，force-cache + tags 标签
   */
  listTags: () =>
    api.get<TagsData>('/tags', undefined, {
      cache: 'force-cache',
      tags: [TAGS_TAG],
      skipAuth: true,
    }),

  /**
   * 站点配置
   * @returns 站点配置信息
   * @description 公开可缓存，force-cache + config 标签（稳定数据不做周期性重验证）
   */
  getConfig: () =>
    api.get<ConfigData>('/config', undefined, {
      cache: 'force-cache',
      tags: [CONFIG_TAG],
      skipAuth: true,
    }),

  /**
   * 更新站点配置
   * @param dto 站点配置更新数据（Partial）
   * @returns 更新后的站点配置
   * @description 需登录（authGuard）
   */
  updateConfig: (dto: Partial<SiteConfig>) => api.put<ConfigData>('/config', dto),
};

/**
 * 请求内去重的公开文章详情（服务端）
 * @param id 文章 ID
 * @returns 公开视图的文章详情 Promise
 * @description 经 React cache() 使 generateMetadata 与页面组件共享同一次公开请求；
 *              公开视图可进 Data Cache（60s + 双标签），草稿对该视角 404
 */
export const getCachedPublicPost = cache((id: string) => blogApi.getPublicPost(id));
