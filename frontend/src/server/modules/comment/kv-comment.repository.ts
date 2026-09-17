/**
 * @file kv-comment.repository.ts
 * @description 评论数据的 KV 仓储：在通用 hash 集合之外维护 postId→评论 ID 集合索引以加速按文章查询，索引缺失时回退全表扫描；仅服务端使用
 */

import 'server-only';
import { getKV } from '@server/infrastructure/kv-mock';
import type { Comment, CommentRepository } from '@my-app/shared';
import { KVRepository } from '@server/infrastructure/kv-repository';

export type { CommentRepository };

/**
 * 评论仓储的 KV 实现：继承通用 hash 集合仓储（集合键 'comments'），额外用 Set 索引 `comments:post:{postId}` 记录每篇文章的评论 ID，实现按文章的高效检索
 */
export class KVCommentRepository extends KVRepository<Comment> implements CommentRepository {
  /** 以通用仓储的 'comments' hash 集合作为主存储 */
  constructor() {
    super('comments');
  }

  /**
   * 按文章查询评论
   * @param postId 文章 ID
   * @returns 该文章的评论列表；无评论时返回空数组
   */
  async findByPostId(postId: string): Promise<Comment[]> {
    const kv = getKV();

    // 优先走 postId→ID 集合索引，命中则用 hmget 批量取正文，避免全表扫描
    const ids = await kv.smembers(`comments:post:${postId}`);
    if (ids.length > 0) {
      const jsons = await kv.hmget<string>(this.collectionKey, ...ids);
      const comments: Comment[] = [];
      for (const json of jsons) {
        if (json) comments.push(JSON.parse(json)); // 索引里可能残留已被删的 ID，hmget 返回 undefined 时跳过
      }
      return comments;
    }

    // 索引缺失（如旧数据未建索引）时回退到全量扫描按 postId 过滤
    const all = await this.findAll();
    return all.filter((c) => c.postId === postId);
  }

  /**
   * 删除某篇文章的全部评论
   * @param postId 文章 ID
   * @returns 实际删除的评论数量；无评论时返回 0
   */
  async deleteByPostId(postId: string): Promise<number> {
    const kv = getKV();
    const comments = await this.findByPostId(postId);
    if (comments.length === 0) return 0;
    // 用 pipeline 批量提交：同时删主存储 hash 条目与 postId 索引成员，二者保持一致
    const pipeline = kv.pipeline();
    for (const comment of comments) {
      pipeline.hdel(this.collectionKey, comment.id);
      pipeline.srem(`comments:post:${postId}`, comment.id);
    }
    await pipeline.exec();
    return comments.length;
  }

  /**
   * 用户改名/换头像后，冗余同步其历史评论里的展示信息
   * @param userId 用户 ID
   * @param userName 新的展示昵称
   * @param userAvatar 新头像；传空值表示清除头像
   * @returns 被更新的评论数量；该用户无评论时返回 0
   */
  async updateUserInfoByUserId(
    userId: string,
    userName: string,
    userAvatar?: string,
  ): Promise<number> {
    const kv = getKV();
    const comments = await this.findAll();
    let updatedCount = 0;
    const pipeline = kv.pipeline();
    for (const c of comments) {
      if (c.userId === userId) {
        updatedCount++;
        const updated = { ...c, userName, userAvatar: userAvatar || undefined }; // 空头像归一为 undefined，避免存空串
        pipeline.hset(this.collectionKey, { [c.id]: JSON.stringify(updated) });
      }
    }
    if (updatedCount > 0) {
      await pipeline.exec(); // 有变更才提交，避免空 pipeline 执行
    }
    return updatedCount;
  }

  /**
   * 新建评论并登记到 postId 索引
   * @param comment 待创建的评论
   * @returns 创建后的评论
   */
  async create(comment: Comment): Promise<Comment> {
    const kv = getKV();
    await kv.sadd(`comments:post:${comment.postId}`, comment.id); // 先登记索引再落库，保证 findByPostId 能命中
    return super.create(comment);
  }

  /**
   * 删除评论并同步清理 postId 索引
   * @param id 评论 ID
   * @returns 是否删除成功（记录不存在时由父类返回 false）
   */
  async delete(id: string): Promise<boolean> {
    const kv = getKV();
    const comment = await this.findById(id);
    if (comment) {
      await kv.srem(`comments:post:${comment.postId}`, id); // 先移索引成员，避免残留指向已删评论的悬空 ID
    }
    return super.delete(id);
  }
}
