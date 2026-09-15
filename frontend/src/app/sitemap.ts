/**
 * @file sitemap.ts
 * @description 生成站点地图，覆盖首页、文章列表、文章详情、分类与标签页面；每小时重新生成，运行时动态获取数据
 */
import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import {
  listPostsServer,
  getCategoriesServer,
  getTagsServer,
} from '@/services/blog/server';
import { SITE_URL } from '@/config/site';

/** Sitemap 每小时重新生成一次 */
export const revalidate = 3600;

/**
 * 生成站点地图 URL 列表，覆盖首页、文章列表、详情、分类与标签页面
 * @returns Sitemap 条目数组
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /**
   * 显式声明依赖请求上下文，防止构建期预渲染出空 sitemap
   * 构建时自域 API 未运行，运行时动态生成，文章数据命中 Data Cache
   */
  await connection();

  const baseUrl = SITE_URL;

  // 静态页面
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    {
      url: `${baseUrl}/posts`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
  ];

  // 并行获取文章、分类、标签数据
  const [postsData, categoriesData, tagsData] = await Promise.all([
    listPostsServer({ page: 1, limit: 1000 }).catch(() => null),
    getCategoriesServer().catch(() => ({ categories: [] })),
    getTagsServer().catch(() => ({ tags: [] })),
  ]);

  // 动态文章页面
  const postPages: MetadataRoute.Sitemap = (postsData?.posts ?? []).map((post) => ({
    url: `${baseUrl}/posts/${post.id}`,
    lastModified: new Date(post.updatedAt || post.createdAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // 分类页面
  const categoryPages: MetadataRoute.Sitemap = (categoriesData.categories ?? []).map((c) => ({
    url: `${baseUrl}/posts?category=${encodeURIComponent(c)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // 标签页面
  const tagPages: MetadataRoute.Sitemap = (tagsData.tags ?? []).map((t) => ({
    url: `${baseUrl}/posts?tag=${encodeURIComponent(t.name)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  return [...staticPages, ...postPages, ...categoryPages, ...tagPages];
}
