/**
 * @file kv-blog.repository.ts
 * @description 博客数据的 KV 文档仓储：以单个 'blog:db' 文档存全部文章/分类/站点配置，读时做结构兜底；仅服务端使用
 */

import 'server-only';
import { KVDocumentStore } from '@server/infrastructure/kv-store';

import type { BlogDB, SiteConfig, BlogRepository } from '@my-app/shared';

/** 站点配置默认值，用于文档缺失/字段为空时兜底 */
const DEFAULT_SITE_CONFIG: SiteConfig = {
  blogName: '工程笔记',

  author: 'Hui Shu',
};

/** 博客文档初始结构，作为 KV 中尚无数据时的默认值 */
const DEFAULT_BLOG_DB: BlogDB = {
  posts: [],

  categories: [],

  siteConfig: DEFAULT_SITE_CONFIG,
};

/**
 * 将 KV 读回的未知结构规整为合法 BlogDB
 * @param data 存储层返回的原始数据，可能缺字段或类型不符（首次启动、脏数据）
 * @returns 字段齐全、类型安全的 BlogDB；集合缺失回退空数组，站点配置字段缺失回退默认值
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
 * 博客仓储的 KV 实现：所有文章/分类/站点配置存于单个 'blog:db' 文档，读时归一化，写走带重试的乐观更新
 */
export class KVBlogRepository implements BlogRepository {
  /** 底层单文档存储，key 固定为 'blog:db' */
  private readonly store: KVDocumentStore<BlogDB>;

  constructor() {
    this.store = new KVDocumentStore<BlogDB>('blog:db', DEFAULT_BLOG_DB);
  }

  /**
   * 读取整个博客文档
   * @returns 归一化后的 BlogDB（结构一定完整）
   */
  async read(): Promise<BlogDB> {
    return normalizeBlogDB(await this.store.read());
  }

  /**
   * 整体覆盖写入博客文档
   * @param db 待写入的完整文档
   */
  async write(db: BlogDB): Promise<void> {
    await this.store.write(db);
  }

  /**
   * 以带冲突重试的方式更新文档
   * @param mutate 接收当前文档并返回结果的变更函数，可能在重试时被多次调用，须保持幂等
   * @returns mutate 的返回值
   * @template R 变更函数的返回类型
   */
  async updateWithRetry<R>(mutate: (db: BlogDB) => R): Promise<R> {
    return this.store.updateWithRetry(mutate);
  }

  /**
   * 文章浏览量 +1
   * @param postId 文章 ID；文章不存在时静默跳过，不抛异常
   */
  async incrementView(postId: string): Promise<void> {
    await this.updateWithRetry((db) => {
      const post = db.posts.find((p) => p.id === postId);
      if (!post) return;
      post.views = (post.views ?? 0) + 1; // views 可能未初始化，空值按 0 起算
    });
  }

  /**
   * 更新文章评论计数
   * @param postId 文章 ID；文章不存在时静默跳过
   * @param delta 计数增量，+1（新增评论）或 -1（删除评论）
   */
  async updateCommentsCount(postId: string, delta: 1 | -1): Promise<void> {
    await this.updateWithRetry((db) => {
      const post = db.posts.find((p) => p.id === postId);
      if (!post) return;
      post.commentsCount = Math.max(0, (post.commentsCount ?? 0) + delta); // 下限钳制为 0，防止计数被减成负数
    });
  }
}
