/**
 * @file kv-user.repository.ts
 * @description 基于 KV 存储的用户仓储实现：用户 CRUD，并同步维护 email/username 索引，供 auth 模块使用
 */

import 'server-only';
import { getKV } from '@server/infrastructure/kv-mock';
import type { User, UserRepository } from '@my-app/shared';
import { KVRepository } from '@server/infrastructure/kv-repository';

export type { UserRepository };

/**
 * 用户仓储实现
 * @description 扩展 KVRepository 维护 users:email: 与 users:username: 索引，支持按 email 查询与占用校验
 */
export class KVUserRepository extends KVRepository<User> implements UserRepository {
  constructor() {
    super('users');
  }

  /**
   * 按 email 查询用户
   * @param email 用户邮箱，查询前统一转为小写
   * @returns 匹配的用户，未找到返回 undefined
   */
  // ponytail: 全量扫描查找 email，用户量增大后应使用已有的 users:email: 索引直接 GET。
  async findByEmail(email: string): Promise<User | undefined> {
    const normalized = email.toLowerCase();
    const users = await this.findAll();
    return users.find((u) => u.email.toLowerCase() === normalized);
  }

  /**
   * 判断 email/username 是否已存在
   * @param email 用户邮箱，查询前统一转为小写
   * @param username 用户名
   * @returns 任一存在返回 true，均不存在返回 false
   */
  async existsByEmailOrUsername(email: string, username: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase();
    const users = await this.findAll();
    return users.some((u) => u.email.toLowerCase() === normalizedEmail || u.username === username);
  }

  /**
   * 覆盖父类 create：创建用户并同步维护 email/username 索引
   * @param user 待创建的用户
   * @returns 创建后的用户
   */
  async create(user: User): Promise<User> {
    const kv = getKV();
    await kv.set(`users:email:${user.email.toLowerCase()}`, user.id);
    await kv.set(`users:username:${user.username}`, user.id);
    return super.create(user);
  }

  /**
   * 覆盖父类 update：更新成功后同步维护 email/username 索引
   * @param id 用户ID
   * @param partial 待更新的用户字段
   * @returns 更新后的用户，用户不存在返回 undefined
   */
  async update(id: string, partial: Partial<User>): Promise<User | undefined> {
    const kv = getKV();
    const updated = await super.update(id, partial);
    if (updated) {
      await kv.set(`users:email:${updated.email.toLowerCase()}`, updated.id);
      await kv.set(`users:username:${updated.username}`, updated.id);
    }
    return updated;
  }

  /**
   * 覆盖父类 delete：删除用户并同步清空 email/username 索引
   * @param id 用户ID
   * @returns 是否删除成功
   */
  async delete(id: string): Promise<boolean> {
    const kv = getKV();
    const user = await this.findById(id);
    if (user) {
      await kv.set(`users:email:${user.email.toLowerCase()}`, '');
      await kv.set(`users:username:${user.username}`, '');
    }
    return super.delete(id);
  }
}
