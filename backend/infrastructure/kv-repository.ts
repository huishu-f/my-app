/**
 * @file kv-repository.ts
 * @description 基于 KV hash 的泛型实体仓储基类，提供 CRUD 与空库 seed；底层异常统一包装为 InternalServerError
 */
import { getKV } from './kv-mock';
import { InternalServerError, isAppErrorWithStatus } from '../errors/index';
import { logger } from '../utils/logger';

/**
 * KV hash 实体仓储基类：以一个 hash 键（collectionKey）承载某类实体的全部记录，field 为实体 id、value 为 JSON 串。
 * @template T 实体类型，须含字符串 id 作为 hash field 主键
 */
export abstract class KVRepository<T extends { id: string }> {
  /** 该集合在 KV 中的 hash 键名 */
  protected readonly collectionKey: string;

  /**
   * @param collectionKey 集合在 KV 中的 hash 键名，子类据此区分不同实体空间
   */
  constructor(collectionKey: string) {
    this.collectionKey = collectionKey;
  }

  /**
   * 查询集合内全部实体
   * @returns 实体数组；集合为空时返回空数组，不返回 null
   * @throws 底层读写异常时抛出 InternalServerError
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
   * 按 id 查询单个实体
   * @param id 实体 id（即 hash field）
   * @returns 实体；不存在时返回 undefined，不抛异常
   * @throws 底层读写或 JSON 解析异常时抛出 InternalServerError
   */
  async findById(id: string): Promise<T | undefined> {
    try {
      const kv = getKV();
      const json = await kv.hget<string>(this.collectionKey, id);
      if (!json) return undefined;
      return JSON.parse(json) as T;
    } catch (err) {
      // 已由内层包装的 InternalServerError 直接透传，避免重复包装与重复日志
      if (isAppErrorWithStatus(err, 500)) throw err;
      logger.error('读取数据失败', { collection: this.collectionKey, id, error: String(err) });
      throw new InternalServerError('读取数据失败');
    }
  }

  /**
   * 新建实体（以 item.id 为 hash field 写入 JSON）
   * @returns 回传入参实体
   * @throws 写入异常时抛出 InternalServerError
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
   * 局部更新实体：读取现有记录后浅合并 partial，并强制保留原 id
   * @returns 更新后的实体；记录不存在时返回 undefined
   * @throws 读写异常时抛出 InternalServerError
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
      // 已是 InternalServerError 时直接透传，避免重复包装
      if (isAppErrorWithStatus(err, 500)) throw err;
      logger.error('更新数据失败', { id, error: String(err) });
      throw new InternalServerError('更新数据失败');
    }
  }

  /**
   * CAS 局部更新实体：在乐观锁内基于最新记录浅合并 partial 并写回，写前递增字段版本。
   * 与 update 的区别：并发写不互相覆盖（update 是裸 hget→merge→hset，丢更新窗口）,
   * 且维护 __v:{collection}:{id} 版本键，hUpdateCAS/hUpdateCASPartial 的冲突检测由此生效。
   * @returns 更新后的实体；记录不存在返回 undefined；冲突重试耗尽返回 undefined（调用方按业务判定）
   */
  async updateCAS(id: string, partial: Partial<T>): Promise<T | undefined> {
    const kv = getKV();
    let updated: T | undefined;
    const ok = await kv.hUpdateCAS<T>(this.collectionKey, id, (current) => {
      updated = { ...current, ...partial, id };
      return updated;
    });
    return ok ? updated : undefined;
  }

  /**
   * 按 id 删除实体
   * @returns 是否确有记录被删除（false 表示该 id 不存在）
   * @throws 删除异常时抛出 InternalServerError
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
   * 空库初始化：仅当集合当前为空且提供了数据时，批量写入 seed 数据
   * @throws 写入异常时抛出 InternalServerError
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
