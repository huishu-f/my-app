/**
 * @file cache.ts
 * @description Next.js 标签缓存失效工具：按业务域批量调用 revalidateTag 清除缓存，expire:0 表示立即失效
 */
import 'server-only';
import { revalidateTag } from 'next/cache';

/** 博客列表页共享的缓存标签：文章列表、分类、标签 */
const BLOG_TAGS = ['posts', 'categories', 'tags'] as const;

/** 站点配置缓存标签 */
const CONFIG_TAG = 'config';

/**
 * 失效博客相关缓存
 *
 * - 未提供 postId：列表级变更（新建文章会改变全量列表、分类、标签聚合）
 * - 提供 postId：精确失效挂有 post:{postId} 标签的单篇缓存（见 services/blog/server.ts 的
 *   getPublicPostCached，其 tags 数组含该动态标签），其余文章缓存不受牵连
 * @param postId 可选文章 id；提供时额外失效该文章专属标签 post:{id}
 */
export function invalidateBlogCache(postId?: string): void {
  // expire:0 表示立即失效（非秒数），触发下列标签缓存全部作废
  for (const tag of BLOG_TAGS) {
    revalidateTag(tag, { expire: 0 });
  }
  if (postId) {
    revalidateTag(`post:${postId}`, { expire: 0 });
  }
}

/**
 * 失效站点配置缓存
 */
export function invalidateConfigCache(): void {
  revalidateTag(CONFIG_TAG, { expire: 0 });
}
