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
 * 失效博客相关缓存。
 *
 * 只有**列表级**一种粒度：任意一篇文章的增删改都会改变列表与分类/标签聚合，所以这里不区分「改的是哪一篇」。
 *
 * 曾经有过一个更细的 `post:{id}` 标签，但它从未真正生效 —— 单篇详情缓存同时也挂了 `posts`，
 * 而本函数无条件失效 `posts`，细标签永远不会被单独命中。去掉它不改变任何可观测行为，
 * 分析过程见 `services/blog/load.ts` 的 `getPublicPostCached`。
 *
 * ponytail: 想恢复逐篇失效精度，需要 Next 的 `cacheComponents` + `'use cache'` + `cacheTag()`，见同处注释。
 */
export function invalidateBlogCache(): void {
  // expire:0 表示立即失效（非秒数），触发下列标签缓存全部作废
  for (const tag of BLOG_TAGS) {
    revalidateTag(tag, { expire: 0 });
  }
}

/**
 * 失效站点配置缓存
 */
export function invalidateConfigCache(): void {
  revalidateTag(CONFIG_TAG, { expire: 0 });
}
