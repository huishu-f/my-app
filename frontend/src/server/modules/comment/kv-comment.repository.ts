/**
 * @file kv-comment.repository.ts
 * @description 基于 KV 存储的评论仓储实现：评论 CRUD、按文章查询/删除，并维护 postId 索引
 */

import 'server-only';
import { getKV } from '@server/infrastructure/kv-mock';
import type { Comment, CommentRepository } from '@my-app/shared';
import { KVRepository } from '@server/infrastructure/kv-repository';

export type { CommentRepository };

/**
 * 评论仓储实现
 * @description 扩展 KVRepository 维护 comments:post:${postId} 索引集合，支持按文章查询/删除与批量更新用户信息
 */
export class KVCommentRepository extends KVRepository<Comment> implements CommentRepository {
  constructor() {
    super('comments');
  }

  /**
   * 按文章 ID 查询评论
   * @param postId 文章ID
   * @returns 该文章下的评论列表（优先走 postId 索引，旧数据回退全量扫描）
   */
  async findByPostId(postId: string): Promise<Comment[]> {
    const kv = getKV();
    // 优先使用 postId 索引集合
    const ids = await kv.smembers(`comments:post:${postId}`);
    if (ids.length > 0) {
      const jsons = await kv.hmget<string>(this.collectionKey, ...ids);
      const comments: Comment[] = [];
      for (const json of jsons) {
        if (json) comments.push(JSON.parse(json));
      }
      return comments;
    }
    // 回退到全量扫描（用于未建索引的旧数据）
    const all = await this.findAll();
    return all.filter((c) => c.postId === postId);
  }

  /**
   * 删除某文章下的全部评论，并清理对应索引
   * @param postId 文章ID
   * @returns 删除的评论数量
   */
  async deleteByPostId(postId: string): Promise<number> {
    const kv = getKV();
    const comments = await this.findByPostId(postId);
    if (comments.length === 0) return 0;
    const pipeline = kv.pipeline();
    for (const comment of comments) {
      pipeline.hdel(this.collectionKey, comment.id);
      pipeline.srem(`comments:post:${postId}`, comment.id);
    }
    await pipeline.exec();
    return comments.length;
  }

  /**
   * 批量更新某用户在其所有评论中的昵称与头像
   * @param userId 用户ID
   * @param userName 新昵称
   * @param userAvatar 新头像 URL，可选
   * @returns 被更新到的评论数量
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
        const updated = { ...c, userName, userAvatar: userAvatar || undefined };
        pipeline.hset(this.collectionKey, { [c.id]: JSON.stringify(updated) });
      }
    }
    if (updatedCount > 0) {
      await pipeline.exec();
    }
    return updatedCount;
  }

  /**
   * 覆盖父类 create：创建评论并同步维护 postId 索引
   * @param comment 待创建的评论
   * @returns 创建后的评论
   */
  async create(comment: Comment): Promise<Comment> {
    const kv = getKV();
    await kv.sadd(`comments:post:${comment.postId}`, comment.id);
    return super.create(comment);
  }

  /**
   * 覆盖父类 delete：删除评论并同步从 postId 索引移除
   * @param id 评论ID
   * @returns 是否删除成功
   */
  async delete(id: string): Promise<boolean> {
    const kv = getKV();
    const comment = await this.findById(id);
    if (comment) {
      await kv.srem(`comments:post:${comment.postId}`, id);
    }
    return super.delete(id);
  }
}
