/**
 * @file kv-repository.ts
 * @description KV 仓储抽象基类，基于 Redis Hash 提供实体 CRUD 与种子数据初始化；供业务仓储继承，仅服务端使用
 */
import 'server-only';
import { getKV } from './kv-mock';
import { InternalServerError } from '@server/errors';
import { logger } from '@server/utils/logger';

/**
 * KV 仓储抽象基类，替代 JsonRepository
 * @description 使用 Redis Hash 存储实体集合，结构为 HSET {collectionKey} {id} {JSON}，提供 CRUD 操作，
 *              Redis 原子操作无需乐观锁；泛型 T 为实体类型，须包含 id 字段
 */
export abstract class KVRepository<T extends { id: string }> {
  /** 实体集合对应的 Hash 键名 */
  protected readonly collectionKey: string;

  /**
   * 初始化仓储
   * @param collectionKey 实体集合对应的 Hash 键名
   */
  constructor(collectionKey: string) {
    this.collectionKey = collectionKey;
  }

  /**
   * 查询全部实体
   * @returns 实体数组，集合为空时返回空数组
   * @throws KV 读取失败时抛出 InternalServerError
   */
  async findAll(): Promise<T[]> {
    try {
      const kv = getKV();
      const raw = await kv.hgetall<Record<string, string>>(this.collectionKey);
      if (!raw) return [];
      return Object.values(raw).map((json) => JSON.parse(json) as T);
    } catch (err) {
      logger.error('读取数据失败', { collection: this.collectionKey, error: String(err) });
      throw new InternalServerError('读取数据失败');
    }
  }

  /**
   * 根据 ID 查询实体
   * @param id 实体 ID
   * @returns 实体，不存在时返回 undefined
   * @throws KV 读取失败时抛出 InternalServerError
   */
  async findById(id: string): Promise<T | undefined> {
    try {
      const kv = getKV();
      const json = await kv.hget<string>(this.collectionKey, id);
      if (!json) return undefined;
      return JSON.parse(json) as T;
    } catch (err) {
      if (err instanceof InternalServerError) throw err;
      logger.error('读取数据失败', { collection: this.collectionKey, id, error: String(err) });
      throw new InternalServerError('读取数据失败');
    }
  }

  /**
   * 创建实体，同 ID 已存在时直接覆盖
   * @param item 待创建的实体
   * @returns 创建后的实体
   * @throws KV 写入失败时抛出 InternalServerError
   */
  async create(item: T): Promise<T> {
    try {
      const kv = getKV();
      await kv.hset(this.collectionKey, { [item.id]: JSON.stringify(item) });
      return item;
    } catch (err) {
      logger.error('创建数据失败', { collection: this.collectionKey, error: String(err) });
      throw new InternalServerError('创建数据失败');
    }
  }

  /**
   * 部分更新实体，合并已有数据并固定 ID
   * @param id 实体 ID
   * @param partial 待更新的字段
   * @returns 更新后的实体，不存在时返回 undefined
   * @throws KV 读写失败时抛出 InternalServerError
   */
  async update(id: string, partial: Partial<T>): Promise<T | undefined> {
    try {
      const kv = getKV();
      const json = await kv.hget<string>(this.collectionKey, id);
      if (!json) return undefined;
      const existing = JSON.parse(json) as T;
      const updated = { ...existing, ...partial, id };
      await kv.hset(this.collectionKey, { [id]: JSON.stringify(updated) });
      return updated;
    } catch (err) {
      if (err instanceof InternalServerError) throw err;
      logger.error('更新数据失败', { id, error: String(err) });
      throw new InternalServerError('更新数据失败');
    }
  }

  /**
   * 删除实体
   * @param id 实体 ID
   * @returns 是否删除成功，实体不存在时返回 false
   * @throws KV 删除失败时抛出 InternalServerError
   */
  async delete(id: string): Promise<boolean> {
    try {
      const kv = getKV();
      const result = await kv.hdel(this.collectionKey, id);
      return result > 0;
    } catch (err) {
      logger.error('删除数据失败', { collection: this.collectionKey, id, error: String(err) });
      throw new InternalServerError('删除数据失败');
    }
  }

  /**
   * 初始化种子数据，仅当集合为空时写入
   * @param data 种子实体列表
   * @throws KV 读取或写入失败时抛出 InternalServerError
   */
  async seed(data: T[]): Promise<void> {
    const existing = await this.findAll();
    if (existing.length === 0 && data.length > 0) {
      try {
        const kv = getKV();
        const entries: Record<string, string> = {};
        for (const item of data) {
          entries[item.id] = JSON.stringify(item);
        }
        await kv.hset(this.collectionKey, entries);
      } catch (err) {
        logger.error('初始化数据失败', { collection: this.collectionKey, error: String(err) });
        throw new InternalServerError('初始化数据失败');
      }
    }
  }
}
