/**
 * @file kv-user.repository.ts
 * @description 基于 KV 存储的用户仓储实现。负责用户实体的 CRUD，
 *              并在写入时同步维护 users:email: 与 users:username: 两个索引 key，
 *              供 auth 模块的用户查询与唯一性校验使用。仅限服务端（server-only）。
 */

import 'server-only';
import { getKV } from '@server/infrastructure/kv-mock';
import type { User, UserRepository } from '@my-app/shared';
import { KVRepository } from '@server/infrastructure/kv-repository';

export type { UserRepository };

/**
 * 用户仓储实现
 * @description 继承泛型 KVRepository<User>（集合名 users），
 *              在 create/update/delete 时同步维护 email/username 索引，
 *              对外实现 shared 包定义的 UserRepository 接口。
 */
export class KVUserRepository extends KVRepository<User> implements UserRepository {
  /**
   * 初始化用户仓储
   * @description 以 'users' 作为 KV 集合名调用父类构造器
   */
  constructor() {
    super('users');
  }

  /**
   * 按 email 查询用户
   * @param email 用户邮箱，查询前统一转为小写以做不区分大小写匹配
   * @returns 匹配到的第一个用户，未找到返回 undefined
   * @example
   * await repo.findByEmail('Foo@Bar.com')
   */
  // ponytail: 全量扫描查找 email，用户量增大后应使用已有的 users:email: 索引直接 GET。
  async findByEmail(email: string): Promise<User | undefined> {
    const normalized = email.toLowerCase();
    const users = await this.findAll();
    return users.find((u) => u.email.toLowerCase() === normalized);
  }

  /**
   * 判断 email 或 username 是否已被占用
   * @param email 用户邮箱，统一转小写后比较
   * @param username 用户名，区分大小写精确比较
   * @returns 任一已存在返回 true，均不存在返回 false
   */
  async existsByEmailOrUsername(email: string, username: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase();
    const users = await this.findAll();
    return users.some((u) => u.email.toLowerCase() === normalizedEmail || u.username === username);
  }

  /**
   * 创建用户（覆盖父类）
   * @description 先写入 email/username 索引（指向用户 ID），再调用父类 create 落库
   * @param user 待创建的完整用户对象
   * @returns 创建成功后的用户对象
   */
  async create(user: User): Promise<User> {
    const kv = getKV();
    await kv.set(`users:email:${user.email.toLowerCase()}`, user.id);
    await kv.set(`users:username:${user.username}`, user.id);
    return super.create(user);
  }

  /**
   * 更新用户（覆盖父类）
   * @description 父类更新成功后，按最新 email/username 重写索引，保证索引与实体一致
   * @param id 用户ID
   * @param partial 待更新的用户字段子集
   * @returns 更新后的用户对象，用户不存在时返回 undefined
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
   * 删除用户（覆盖父类）
   * @description 删除前先查回用户，用空串清空 email/username 索引，再调用父类 delete
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
