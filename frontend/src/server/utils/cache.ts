/**
 * @file 缓存失效工具
 * @description 集中管理 Next.js revalidateTag 缓存失效调用，
 *              避免标签字符串字面量散落各处；标签名与前端 services/blog/api.ts 中的
 *              fetch 缓存标签保持一致，写操作后统一失效对应缓存。
 */
import 'server-only';
import { revalidateTag } from 'next/cache';

/**
 * 博客内容缓存标签集合
 * @description 列表 / 分类 / 标签三个粒度的缓存标签，任一博客写操作后统一失效
 */
const BLOG_TAGS = ['posts', 'categories', 'tags'] as const;

/** 站点配置缓存标签 */
const CONFIG_TAG = 'config';

/**
 * 失效博客内容缓存
 * @description 立即失效文章列表、分类、标签三类标签的缓存；
 *              传入 postId 时额外失效该文章详情标签 `post:${postId}`
 * @param postId 文章 ID，可选；传入时同时失效单篇文章详情缓存
 * @example
 * invalidateBlogCache(post.id) // 发布/编辑文章后调用
 */
export function invalidateBlogCache(postId?: string): void {
  for (const tag of BLOG_TAGS) {
    revalidateTag(tag, { expire: 0 });
  }
  if (postId) {
    revalidateTag(`post:${postId}`, { expire: 0 });
  }
}

/**
 * 失效站点配置缓存
 * @description 立即失效 config 标签的全部缓存数据
 */
export function invalidateConfigCache(): void {
  revalidateTag(CONFIG_TAG, { expire: 0 });
}
