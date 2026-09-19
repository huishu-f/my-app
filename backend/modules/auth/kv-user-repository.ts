/**
 * @file kv-user-repository.ts
 * @description 基于 KV 的用户仓储：主记录按 id 存 hash，email/username 用 string 索引键直达 id；注册唯一性由 set 索引原子保证；仅服务端可用
 */
import { getKV } from '../../infrastructure/kv-mock';
import type { User, UserStats, UserRepository } from '@my-app/shared';
import { KVRepository } from '../../infrastructure/kv-repository';

/** 复用 shared 中的用户仓储接口类型 */
export type { UserRepository };

/**
 * 用户 KV 仓储：
 * - 主记录：'users' hash，field=id，value=用户 JSON
 * - 二级索引：users:email:{小写邮箱} / users:username:{用户名} string 键，值直达 user.id（查询 O(1)，不再全表扫描）
 * - 唯一性：users:emails / users:usernames 两个 set，注册用原子 sadd 抢占，重复返回 0 → 竞态下也注册不出同 email 双账号
 */
export class KVUserRepository extends KVRepository<User> implements UserRepository {
  /** 初始化，绑定 KV 集合命名空间 */
  constructor() {
    // 'users' 作为用户主记录在 KV 中的集合前缀
    super('users');
  }

  /**
   * 按邮箱查用户（大小写不敏感）
   * @param email 邮箱
   * @returns 匹配的用户；不存在或索引为空哨兵（已删除用户）时返回 undefined，不抛异常
   */
  async findByEmail(email: string): Promise<User | undefined> {
    const kv = getKV();
    const id = await kv.get<string>(`users:email:${email.toLowerCase()}`);
    if (!id) return undefined; // 索引值是 userId 字符串；null=无记录，''=已删除用户哨兵
    return this.findById(id);
  }

  /**
   * 判断邮箱或用户名是否已被占用，用于注册查重
   * @param email 邮箱
   * @param username 用户名
   * @returns 任一命中返回 true，否则 false
   */
  async existsByEmailOrUsername(email: string, username: string): Promise<boolean> {
    const kv = getKV();
    // 走索引：email 取记录后回查主存储（防御空串哨兵误判），username 索引非空即占用
    const emailId = await kv.get<string>(`users:email:${email.toLowerCase()}`);
    if (emailId) {
      const user = await this.findById(emailId);
      if (user) return true; // 索引指向有效记录才算占用（已被删除的空哨兵不算）
    }
    const usernameId = await kv.get<string>(`users:username:${username}`);
    if (usernameId) {
      const user = await this.findById(usernameId);
      if (user) return true;
    }
    return false;
  }

  /**
   * 原子抢占注册名额：SADD 返回 0 表示 email/username 已被占用
   * @param email 邮箱
   * @param username 用户名
   * @returns true=抢占成功可继续落库；false=已被占用（并发注册也只有一个成功）
   */
  async claimRegistration(email: string, username: string): Promise<boolean> {
    const kv = getKV();
    const emailAdded = await kv.sadd('users:emails', email.toLowerCase());
    if (emailAdded === 0) return false;
    const usernameAdded = await kv.sadd('users:usernames', username);
    if (usernameAdded === 0) {
      // username 冲突：回滚已抢占的 email 名额，不留死锁位
      await kv.srem('users:emails', email.toLowerCase());
      return false;
    }
    return true;
  }

  /**
   * 释放注册名额（主记录写入失败时回滚，避免名额永久被占）
   * @param email 邮箱
   * @param username 用户名
   */
  async releaseRegistration(email: string, username: string): Promise<void> {
    const kv = getKV();
    await kv.srem('users:emails', email.toLowerCase());
    await kv.srem('users:usernames', username);
  }

  /**
   * 新建用户：先原子抢占唯一性名额并写 email/username 二级索引，再落主记录
   * @param user 用户对象
   * @returns 创建后的用户
   */
  async create(user: User): Promise<User> {
    const kv = getKV();
    const claimed = await this.claimRegistration(user.email, user.username);
    if (!claimed) {
      return Promise.reject(new Error(`注册冲突: ${user.email} / ${user.username}`));
    }
    try {
      // email 键统一小写、username 键用原值，值均为 user.id，指向主记录
      await kv.set(`users:email:${user.email.toLowerCase()}`, user.id);
      await kv.set(`users:username:${user.username}`, user.id);
      return await super.create(user);
    } catch (err) {
      // 主记录写入失败 → 释放名额并同步回收索引，避免名额泄漏
      await this.releaseRegistration(user.email, user.username);
      throw err;
    }
  }

  /**
   * 原子增减用户统计字段（articles/likes/views）：CAS 读-改-写，并发下不丢更新
   * @param id 用户 ID
   * @param field 统计字段名
   * @param delta 增量（正/负均可）
   * @returns 更新是否成功（用户不存在返回 false）
   */
  async incrementStats(id: string, field: keyof UserStats, delta: number): Promise<boolean> {
    const kv = getKV();
    return kv.hUpdateCAS<User>('users', id, (user) => ({
      ...user,
      stats: { ...user.stats, [field]: Math.max(0, (user.stats?.[field] ?? 0) + delta) },
    }));
  }

  /**
   * 原子切换用户与文章的关联（点赞/收藏列表的增删）：CAS 内基于最新列表判断是否已含该文章
   * @param id 用户 ID
   * @param field 关联列表字段（likedArticles / favoritedArticles）
   * @param postId 文章 ID
   * @param onToggle 可选回调，收到切换前该文章是否已在列表中（调用方据此决定计数 ±1）
   * @returns 切换是否成功（用户不存在返回 false）
   */
  async toggleAssociation(
    id: string,
    field: 'likedArticles' | 'favoritedArticles',
    postId: string,
    onToggle?: (wasPresent: boolean) => void,
  ): Promise<boolean> {
    const kv = getKV();
    return kv.hUpdateCAS<User>('users', id, (user) => {
      const list = user[field] ?? [];
      const wasPresent = list.includes(postId);
      onToggle?.(wasPresent);
      return {
        ...user,
        [field]: wasPresent ? list.filter((pid) => pid !== postId) : [...list, postId],
      };
    });
  }

  /**
   * 更新用户并同步二级索引
   *
   * 走 CAS（updateCAS）而非裸 merge：auth-service 的改密/登出在同一写入里递增 tokenVersion，
   * 裸 hget→merge→hset 会与 incrementStats/toggleAssociation 并发互删字段——
   * tokenVersion 提升被覆盖回旧值意味着改密后旧 token 仍然有效（安全缺陷）。
   * @param id 用户 ID
   * @param partial 需更新的字段集合
   * @returns 更新后的用户；不存在或冲突重试耗尽时返回 undefined
   */
  async update(id: string, partial: Partial<User>): Promise<User | undefined> {
    const kv = getKV();
    const updated = await this.updateCAS(id, partial);
    // 仅在有变更时按最新值覆盖索引；未清理旧的 email/username 键，改邮箱/改名后可能残留旧索引
    if (updated) {
      await kv.set(`users:email:${updated.email.toLowerCase()}`, updated.id);
      await kv.set(`users:username:${updated.username}`, updated.id);
    }
    return updated;
  }

  /**
   * 删除用户并清除二级索引与注册名额
   * @param id 用户 ID
   * @returns 是否成功删除主记录
   */
  async delete(id: string): Promise<boolean> {
    const kv = getKV();
    // 先取回用户以拿到其 email/username，才能定位并清除对应索引键
    const user = await this.findById(id);
    if (user) {
      // 以空串 '' 哨兵覆盖索引键（而非物理删除），标记该映射失效
      await kv.set(`users:email:${user.email.toLowerCase()}`, '');
      await kv.set(`users:username:${user.username}`, '');
      await kv.srem('users:emails', user.email.toLowerCase());
      await kv.srem('users:usernames', user.username);
    }
    return super.delete(id);
  }
}
