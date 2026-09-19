/**
 * @file api.ts
 * @description 博客领域客户端读接口集合：文章列表/详情、草稿与收藏、点赞收藏切换、站点配置；失败统一抛 ApiRequestError
 *
 * 文章的增、改、删不在此处：它们由 Server Action 承担（见 services/blog/actions.ts），
 * 因为只有 Action 内的重验证才能清掉浏览器 Client Cache，避免作者改完返回页面看到旧内容。
 */
import { api } from '@/lib/api/request';
import type {
  ConfigData,
  FavoriteToggleData,
  FavoritesData,
  LikeData,
  PostData,
  PostListParams,
  PostsListData,
  SiteConfig,
} from '@my-app/shared';

/** ISR 缓存标签：文章列表相关（浏览器端 fetch 实际不消费，仅保留给服务端调用方透传） */
const POSTS_TAG = 'posts';

/** 博客领域读接口集合；get* / list* 为公开读接口配 ISR 缓存，like/favorite/config 等写接口依赖登录态 */
export const blogApi = {
  /**
   * 分页查询文章列表（公开）
   * @param params 列表筛选与分页参数，默认 {}
   * @returns PostsListData；走 ISR 缓存，revalidate 60 秒，按 posts 标签失效
   * @throws 网络或后端异常时抛 ApiRequestError
   */
  listPosts: (params: PostListParams = {}) =>
    api.get<PostsListData>('/posts', params as Record<string, string | number>, {
      revalidate: 60,
      tags: [POSTS_TAG],
      skipAuth: true,
    }),

  /**
   * 获取当前用户的草稿列表（需登录，浏览器端带 Cookie）
   * @returns PostsListData；无草稿或未登录时 posts 为空数组
   * @throws 网络或后端异常时抛 ApiRequestError
   */
  listDrafts: () => api.get<PostsListData>('/posts', { draft: 'true' }),

  /**
   * 获取单篇文章详情，不做缓存以便登录态下取到实时数据（如点赞/收藏状态）
   * @param id 文章 ID
   * @param opts.signal 外部取消信号，组件卸载或切换时可中断请求
   * @returns PostData
   * @throws 文章不存在或网络异常时抛 ApiRequestError
   */
  getPost: (id: string, opts?: { signal?: AbortSignal }) =>
    api.get<PostData>(`/posts/${id}`, undefined, opts),

  /**
   * 切换当前用户对某文章的点赞状态（需登录）
   * @param id 文章 ID
   * @returns LikeData，含切换后的 liked 布尔值
   * @throws 未登录或网络异常时抛 ApiRequestError
   */
  toggleLike: (id: string) => api.post<LikeData>(`/posts/${id}/like`),

  /**
   * 切换当前用户对某文章的收藏状态（需登录）
   * @param id 文章 ID
   * @returns FavoriteToggleData，含切换后的 favorited 布尔值
   * @throws 未登录或网络异常时抛 ApiRequestError
   */
  toggleFavorite: (id: string) => api.post<FavoriteToggleData>(`/posts/${id}/favorite`),

  /**
   * 获取当前用户的收藏文章列表（需登录）
   * @returns FavoritesData；无收藏时 posts 为空数组
   * @throws 未登录或网络异常时抛 ApiRequestError
   */
  listFavorites: () => api.get<FavoritesData>('/favorites'),

  /**
   * 更新站点配置（需登录且有权限）
   * @param dto 待更新的配置字段，Partial<SiteConfig> 支持部分更新
   * @returns 更新后的 ConfigData
   * @throws 无权限、校验失败或网络异常时抛 ApiRequestError
   */
  updateConfig: (dto: Partial<SiteConfig>) => api.put<ConfigData>('/config', dto),
};
