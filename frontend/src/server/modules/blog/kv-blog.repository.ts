/**
 * @file kv-blog.repository.ts
 * @description 基于 KV 文档存储的博客仓储：聚合读写文章/分类/站点配置，提供重试式更新与计数变更能力
 */

import 'server-only';
import { KVDocumentStore } from '@server/infrastructure/kv-store';

import type { BlogDB, SiteConfig, BlogRepository } from '@my-app/shared';

/** 默认站点配置，写入兜底与规范化时复用 */
const DEFAULT_SITE_CONFIG: SiteConfig = {
  blogName: '工程笔记',
  // 默认维护者：与页脚展示（"由 Hui Shu 维护"）保持一致，避免配置与页面文案两处数据源打架
  author: 'Hui Shu',
};

/** 默认博客数据库结构：空文章、空分类，站点配置取默认值 */
const DEFAULT_BLOG_DB: BlogDB = {
  posts: [],
  categories: [],
  siteConfig: DEFAULT_SITE_CONFIG,
};

/**
 * 规范化 KV 中读取的博客数据：缺失或类型不符的字段回退为默认值
 * @param data 原始读取数据
 * @returns 结构完整的 BlogDB
 */
function normalizeBlogDB(data: unknown): BlogDB {
  const db = data as Partial<BlogDB> | undefined;
  return {
    posts: Array.isArray(db?.posts) ? db.posts : [],
    categories: Array.isArray(db?.categories) ? db.categories : [],
    siteConfig: {
      blogName: db?.siteConfig?.blogName || DEFAULT_SITE_CONFIG.blogName,
      author: db?.siteConfig?.author || DEFAULT_SITE_CONFIG.author,
    },
  };
}

export type { BlogRepository };

/**
 * 博客仓储实现
 * @description 基于 KVDocumentStore 聚合博客数据（存储 key 为 blog:db），写入前做结构规范化
 */
export class KVBlogRepository implements BlogRepository {
  private readonly store: KVDocumentStore<BlogDB>;

  constructor() {
    this.store = new KVDocumentStore<BlogDB>('blog:db', DEFAULT_BLOG_DB);
  }

  /**
   * 读取完整博客数据库
   * @returns 规范化后的 BlogDB
   */
  async read(): Promise<BlogDB> {
    return normalizeBlogDB(await this.store.read());
  }

  /**
   * 整体写入博客数据库
   * @param db 待写入的 BlogDB
   */
  async write(db: BlogDB): Promise<void> {
    await this.store.write(db);
  }

  /**
   * 读取-修改-写回原子更新，并发冲突时自动重试
   * @param mutate 变更函数，接收当前 BlogDB，返回任意结果
   * @returns mutate 的返回值
   */
  async updateWithRetry<R>(mutate: (db: BlogDB) => R): Promise<R> {
    return this.store.updateWithRetry(mutate);
  }

  /**
   * 文章阅读数加 1
   * @param postId 文章ID
   */
  async incrementView(postId: string): Promise<void> {
    await this.updateWithRetry((db) => {
      const post = db.posts.find((p) => p.id === postId);
      if (!post) return;
      post.views = (post.views ?? 0) + 1;
    });
  }

  /**
   * 调整文章评论数（增/减 1），结果不小于 0
   * @param postId 文章ID
   * @param delta 变更量：1 为新增一条评论，-1 为删除一条
   */
  async updateCommentsCount(postId: string, delta: 1 | -1): Promise<void> {
    await this.updateWithRetry((db) => {
      const post = db.posts.find((p) => p.id === postId);
      if (!post) return;
      post.commentsCount = Math.max(0, (post.commentsCount ?? 0) + delta);
    });
  }
}
