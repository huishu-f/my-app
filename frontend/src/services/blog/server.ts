/**
 * @file 博客模块服务端数据层
 * @description Server Components 专用的博客数据获取函数，直接调用进程内 Service 层，
 *              绕过 Netlify 私有模式下对 HTTP 回环请求的 401 拦截。
 * @warning 本文件仅可在服务端代码中引入（server-only）
 */
import 'server-only';
import { cache } from 'react';
import { getContainer } from '@server/container';
import { getAuthPayload } from '@/services/auth/server';
import type {
  CategoriesData,
  ConfigData,
  FavoritesData,
  NeighborPostsData,
  PostData,
  PostListParams,
  PostsListData,
  TagsData,
} from '@my-app/shared';

/**
 * 规范化列表查询参数（显式挑拣字段，去除 undefined 冗余键）
 * @param params 原始列表查询参数
 * @returns 透传给 blogService 的参数对象
 */
function normalizeListParams(params: PostListParams) {
  return {
    category: params.category,
    tag: params.tag,
    q: params.q,
    page: params.page,
    limit: params.limit,
  };
}

/**
 * 获取文章列表（服务端）
 * @param params 列表查询参数（分页、分类、标签、关键词），默认空对象
 * @param withAuth 是否注入当前用户上下文（用于草稿感知），默认 false
 * @returns 分页文章列表
 * @description withAuth 为 true 时尝试读取当前请求的鉴权 payload（可能为 null）
 */
export async function listPostsServer(
  params: PostListParams = {},
  withAuth = false,
): Promise<PostsListData> {
  const { blogService } = getContainer();
  const user = withAuth ? await getAuthPayload() : null;
  return blogService.listPosts({ ...normalizeListParams(params), user: user ?? undefined });
}

/**
 * 获取文章详情（服务端，鉴权感知）
 * @param id 文章 ID
 * @returns 文章详情；草稿对非作者视角抛业务错误（404）
 * @description 注入当前请求用户，用于草稿预览与作者判权
 */
export async function getPostServer(id: string): Promise<PostData> {
  const { blogService } = getContainer();
  const user = await getAuthPayload();
  const post = await blogService.getPost(id, user ?? undefined);
  return { post };
}

/**
 * 获取公开文章详情（服务端，请求内缓存）
 * @param id 文章 ID
 * @returns 已发布文章的详情；草稿对该视角 404
 * @description 不注入用户上下文的纯公开视图；用 React cache() 让
 *              generateMetadata 与页面组件共享同一次请求
 */
export const getPublicPostServer = cache(async (id: string): Promise<PostData> => {
  const { blogService } = getContainer();
  const post = await blogService.getPost(id);
  return { post };
});

/**
 * 获取相邻文章（服务端）
 * @param id 当前文章 ID
 * @returns 上一篇 / 下一篇（可能为 null）
 */
export async function getNeighborPostsServer(id: string): Promise<NeighborPostsData> {
  const { blogService } = getContainer();
  return blogService.getNeighborPosts(id);
}

/**
 * 获取全部分类（服务端）
 * @returns 从已发布文章聚合的分类列表
 */
export async function getCategoriesServer(): Promise<CategoriesData> {
  const { blogService } = getContainer();
  return { categories: await blogService.getCategories() };
}

/**
 * 获取全部标签（服务端）
 * @returns 标签列表（含文章数量）
 */
export async function getTagsServer(): Promise<TagsData> {
  const { blogService } = getContainer();
  return { tags: await blogService.getTags() };
}

/**
 * 获取站点配置（服务端）
 * @returns 站点配置信息
 */
export async function getConfigServer(): Promise<ConfigData> {
  const { blogService } = getContainer();
  return { config: await blogService.getConfig() };
}

/**
 * 获取当前用户收藏列表（服务端）
 * @returns 收藏的文章列表；未登录时返回空列表
 */
export async function listFavoritesServer(): Promise<FavoritesData> {
  const { blogService } = getContainer();
  const user = await getAuthPayload();
  if (!user) return { posts: [] };
  return { posts: await blogService.listFavoritePosts(user.id) };
}
