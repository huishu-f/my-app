/**
 * @file KV 仓储抽象基类
 * @description 基于 Redis Hash 的实体仓储基类：每个实体集合占一个 Hash 键
 *              （HSET {collectionKey} {id} {JSON}），提供实体 CRUD 与空集合时的种子数据初始化。
 *              业务仓储继承本类即可获得完整数据访问能力。引入 'server-only' 保证仅服务端使用。
 */
import 'server-only';
import { getKV } from './kv-mock';
import { InternalServerError } from '@server/errors';
import { logger } from '@server/utils/logger';

/**
 * KV 仓储抽象基类
 * @description 使用 Redis Hash 存储实体集合：field 为实体 id，value 为实体 JSON 字符串；
 *              读取时由本类负责 JSON.parse。Redis 单命令原子，无需乐观锁。
 *              泛型 T 为实体类型，必须包含 string 类型的 id 字段
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
   * @returns 实体数组，集合不存在或为空时返回空数组
   * @throws KV 读取抛错时抛出 InternalServerError
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
   * @throws KV 读取抛错时抛出 InternalServerError
   */
  async findById(id: string): Promise<T | undefined> {
    try {
      const kv = getKV();
      const json = await kv.hget<string>(this.collectionKey, id);
      if (!json) return undefined;
      return JSON.parse(json) as T;
    } catch (err) {
      // 已是业务错误直接透传，不重复包装
      if (err instanceof InternalServerError) throw err;
      logger.error('读取数据失败', { collection: this.collectionKey, id, error: String(err) });
      throw new InternalServerError('读取数据失败');
    }
  }

  /**
   * 创建实体
   * @description 以 id 为 field 写入 Hash，同 ID 已存在时直接覆盖（不报错）
   * @param item 待创建的实体
   * @returns 创建后的实体（原样返回）
   * @throws KV 写入抛错时抛出 InternalServerError
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
   * 部分更新实体
   * @description 读取原实体后浅合并 partial，并固定 id 不被覆盖，再整体写回
   * @param id 实体 ID
   * @param partial 待合并的字段
   * @returns 更新后的完整实体，实体不存在时返回 undefined
   * @throws KV 读写抛错时抛出 InternalServerError
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
   * @returns 是否删除成功（实际删除了字段），实体不存在时返回 false
   * @throws KV 删除抛错时抛出 InternalServerError
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
   * 初始化种子数据
   * @description 幂等操作：仅当集合当前为空且种子非空时，批量写入全部种子实体
   * @param data 种子实体列表
   * @throws KV 写入抛错时抛出 InternalServerError
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
