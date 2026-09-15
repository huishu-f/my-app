/**
 * @file server.ts
 * @description 博客模块服务端数据层。Server Components 直接调用进程内 Service 层，
 *              绕过 Netlify 私有模式对 HTTP 回环请求的 401 拦截。
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
 * @param params 列表查询参数
 * @param withAuth 是否尝试注入当前用户（用于草稿模式）
 * @returns PostsListData
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
 * 获取文章详情（服务端，带鉴权）
 * @param id 文章 ID
 * @returns PostData
 */
export async function getPostServer(id: string): Promise<PostData> {
  const { blogService } = getContainer();
  const user = await getAuthPayload();
  const post = await blogService.getPost(id, user ?? undefined);
  return { post };
}

/**
 * 获取公开文章详情（服务端，不带鉴权），仅返回已发布文章；草稿对该视角 404。
 * 使用 cache() 让 generateMetadata 与页面组件共享同一次请求
 * @param id 文章 ID
 * @returns PostData
 */
export const getPublicPostServer = cache(async (id: string): Promise<PostData> => {
  const { blogService } = getContainer();
  const post = await blogService.getPost(id);
  return { post };
});

/**
 * 获取相邻文章（服务端）
 * @param id 当前文章 ID
 * @returns 上一篇 / 下一篇
 */
export async function getNeighborPostsServer(id: string): Promise<NeighborPostsData> {
  const { blogService } = getContainer();
  return blogService.getNeighborPosts(id);
}

/**
 * 获取所有分类（服务端）
 * @returns 分类列表
 */
export async function getCategoriesServer(): Promise<CategoriesData> {
  const { blogService } = getContainer();
  return { categories: await blogService.getCategories() };
}

/**
 * 获取所有标签（服务端）
 * @returns 标签列表（含文章数量）
 */
export async function getTagsServer(): Promise<TagsData> {
  const { blogService } = getContainer();
  return { tags: await blogService.getTags() };
}

/**
 * 获取站点配置（服务端）
 * @returns 站点配置
 */
export async function getConfigServer(): Promise<ConfigData> {
  const { blogService } = getContainer();
  return { config: await blogService.getConfig() };
}

/**
 * 获取当前用户收藏列表（服务端）
 * @returns 收藏的文章列表
 */
export async function listFavoritesServer(): Promise<FavoritesData> {
  const { blogService } = getContainer();
  const user = await getAuthPayload();
  if (!user) return { posts: [] };
  return { posts: await blogService.listFavoritePosts(user.id) };
}
