/**
 * @file kv-blog.repository.ts
 * @description 基于 KV 文档存储的博客仓储：以 blog:db 为 key 聚合存储文章、分类与站点配置，
 *              提供整体读写、读-改-写重试式原子更新，以及阅读数/评论数的原子计数变更。
 *              仅限服务端（server-only）。
 */

import 'server-only';
import { KVDocumentStore } from '@server/infrastructure/kv-store';

import type { BlogDB, SiteConfig, BlogRepository } from '@my-app/shared';

/**
 * 默认站点配置
 * @description 写入兜底与数据规范化时复用的默认值
 */
const DEFAULT_SITE_CONFIG: SiteConfig = {
  /** 博客名称默认值 */
  blogName: '工程笔记',
  // 默认维护者：与页脚展示（"由 Hui Shu 维护"）保持一致，避免配置与页面文案两处数据源打架
  author: 'Hui Shu',
};

/**
 * 默认博客数据库结构
 * @description 空文章、空分类，站点配置取默认值；作为 KVDocumentStore 的初始文档
 */
const DEFAULT_BLOG_DB: BlogDB = {
  /** 文章列表，默认为空 */
  posts: [],
  /** 分类列表，默认为空 */
  categories: [],
  /** 站点配置，取默认值 */
  siteConfig: DEFAULT_SITE_CONFIG,
};

/**
 * 规范化 KV 中读取的博客数据
 * @description posts/categories 非 数组时回退为空数组；siteConfig 字段缺失或为空串时回退默认值，
 *              保证读取方拿到的永远是结构完整的 BlogDB
 * @param data 原始读取数据（unknown）
 * @returns 结构完整、字段类型正确的 BlogDB
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
 * @description 基于 KVDocumentStore<BlogDB>（存储 key 为 blog:db）聚合博客数据，
 *              读取后做结构规范化；写入类操作统一走 updateWithRetry 保证并发安全
 */
export class KVBlogRepository implements BlogRepository {
  private readonly store: KVDocumentStore<BlogDB>;

  /**
   * 初始化博客仓储
   * @description 以 'blog:db' 为存储 key、DEFAULT_BLOG_DB 为初始文档创建 KVDocumentStore
   */
  constructor() {
    this.store = new KVDocumentStore<BlogDB>('blog:db', DEFAULT_BLOG_DB);
  }

  /**
   * 读取完整博客数据库
   * @returns 经过 normalizeBlogDB 规范化后的 BlogDB
   */
  async read(): Promise<BlogDB> {
    return normalizeBlogDB(await this.store.read());
  }

  /**
   * 整体写入博客数据库
   * @param db 待写入的完整 BlogDB
   */
  async write(db: BlogDB): Promise<void> {
    await this.store.write(db);
  }

  /**
   * 读取-修改-写回原子更新
   * @description 由 store 内部处理版本冲突并自动重试，mutate 内抛出的异常会原样抛出
   * @param mutate 变更函数，接收当前 BlogDB，就地修改后返回任意结果
   * @returns mutate 函数的返回值
   */
  async updateWithRetry<R>(mutate: (db: BlogDB) => R): Promise<R> {
    return this.store.updateWithRetry(mutate);
  }

  /**
   * 文章阅读数加 1
   * @param postId 文章 ID，文章不存在时静默忽略
   */
  async incrementView(postId: string): Promise<void> {
    await this.updateWithRetry((db) => {
      const post = db.posts.find((p) => p.id === postId);
      if (!post) return;
      post.views = (post.views ?? 0) + 1;
    });
  }

  /**
   * 调整文章评论计数
   * @param postId 文章 ID，文章不存在时静默忽略
   * @param delta 变更量：1 为新增一条评论，-1 为删除一条
   * @description 结果下限为 0，避免计数出现负数
   */
  async updateCommentsCount(postId: string, delta: 1 | -1): Promise<void> {
    await this.updateWithRetry((db) => {
      const post = db.posts.find((p) => p.id === postId);
      if (!post) return;
      post.commentsCount = Math.max(0, (post.commentsCount ?? 0) + delta);
    });
  }
}
