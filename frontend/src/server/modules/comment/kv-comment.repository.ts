/**
 * @file kv-comment.repository.ts
 * @description 基于 KV 存储的评论仓储实现：评论实体的 CRUD、按文章查询/批量删除，
 *              以及按用户批量更新评论中的昵称与头像。写入时同步维护 comments:post:${postId}
 *              的 Set 索引。仅限服务端（server-only）。
 */

import 'server-only';
import { getKV } from '@server/infrastructure/kv-mock';
import type { Comment, CommentRepository } from '@my-app/shared';
import { KVRepository } from '@server/infrastructure/kv-repository';

export type { CommentRepository };

/**
 * 评论仓储实现
 * @description 继承泛型 KVRepository<Comment>（集合名 comments），
 *              在 create/delete 时维护 postId 索引集合，并扩展按文章查询、
 *              批量删除、批量更新用户信息三个方法。
 */
export class KVCommentRepository extends KVRepository<Comment> implements CommentRepository {
  /**
   * 初始化评论仓储
   * @description 以 'comments' 作为 KV 集合名调用父类构造器
   */
  constructor() {
    super('comments');
  }

  /**
   * 按文章 ID 查询其全部评论
   * @description 优先走 comments:post:${postId} 索引集合批量取回；
   *              索引为空时回退到全量扫描过滤，兼容未建索引的旧数据
   * @param postId 文章 ID
   * @returns 该文章下的评论列表（无排序保证）
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
   * 删除某文章下的全部评论
   * @description 先查出该文章所有评论，再用 pipeline 一次性删除评论实体与索引成员
   * @param postId 文章 ID
   * @returns 实际删除的评论数量，无评论时返回 0
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
   * @description 全量扫描评论，命中该用户的评论用 pipeline 批量重写；
   *              userAvatar 未传时写入 undefined（即清空头像字段）
   * @param userId 用户 ID
   * @param userName 新昵称
   * @param userAvatar 新头像 URL，可选
   * @returns 被更新的评论数量
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
   * 创建评论（覆盖父类）
   * @description 先把评论 ID 加入 comments:post:${postId} 索引集合，再调用父类 create 落库
   * @param comment 待创建的完整评论对象
   * @returns 创建成功后的评论对象
   */
  async create(comment: Comment): Promise<Comment> {
    const kv = getKV();
    await kv.sadd(`comments:post:${comment.postId}`, comment.id);
    return super.create(comment);
  }

  /**
   * 删除评论（覆盖父类）
   * @description 删除前先查回评论，从其所属文章的索引集合中移除，再调用父类 delete
   * @param id 评论 ID
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
