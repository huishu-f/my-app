/**
 * @file cache.ts
 * @description 缓存失效工具函数，集中管理 revalidateTag 调用。
 *              消除 7+ 处散落的 revalidateTag 字面量调用，
 *              标签名称与前端 services/blog/api.ts 的常量保持一致。
 */
import 'server-only';
import { revalidateTag } from 'next/cache';

/** 博客内容缓存标签（列表 / 分类 / 标签三个粒度，写操作统一失效） */
const BLOG_TAGS = ['posts', 'categories', 'tags'] as const;
/** 站点配置缓存标签 */
const CONFIG_TAG = 'config';

/**
 * 失效博客内容缓存（列表 + 分类 + 标签），可选失效单篇文章详情缓存
 * @param postId 文章 ID，传入时额外失效 `post:${postId}` 标签
 */
export function invalidateBlogCache(postId?: string): void {
  for (const tag of BLOG_TAGS) {
    revalidateTag(tag, { expire: 0 });
  }
  if (postId) {
    revalidateTag(`post:${postId}`, { expire: 0 });
  }
}

/** 失效站点配置缓存 */
export function invalidateConfigCache(): void {
  revalidateTag(CONFIG_TAG, { expire: 0 });
}
