/**
 * @file kv-store.ts
 * @description KV 文档存储，以单键保存文档对象，提供读取、写入与带重试的读改写；仅服务端使用
 */
import 'server-only';
import { getKV } from './kv-mock';
import { InternalServerError } from '@server/errors';

/**
 * KV 文档存储，替代 JsonDocumentStore
 * @description 用于存储单一文档对象（如 BlogDB），通过 KV 的 GET/SET 实现，SET 为原子操作，
 *              无需文件锁或写队列；泛型 T 为文档对象类型
 */
export class KVDocumentStore<T> {
  /** 文档存储键名 */
  private readonly key: string;
  /** 键不存在时返回的默认值 */
  private readonly defaultValue: T;

  /**
   * 初始化文档存储
   * @param key 文档存储键名
   * @param defaultValue 读取不到时返回的默认值
   */
  constructor(key: string, defaultValue: T) {
    this.key = key;
    this.defaultValue = defaultValue;
  }

  /**
   * 读取文档
   * @returns 文档数据，键不存在时返回默认值
   * @throws KV 读取失败时抛出 InternalServerError
   */
  async read(): Promise<T> {
    try {
      const kv = getKV();
      const data = await kv.get<T>(this.key);
      if (data === null) return this.defaultValue;
      return data;
    } catch {
      throw new InternalServerError(`读取数据失败: ${this.key}`);
    }
  }

  /**
   * 写入文档，整体覆盖
   * @param data 待写入的文档数据
   * @throws KV 写入失败时抛出 InternalServerError
   */
  async write(data: T): Promise<void> {
    try {
      const kv = getKV();
      await kv.set(this.key, JSON.stringify(data));
    } catch {
      throw new InternalServerError(`写入数据失败: ${this.key}`);
    }
  }

  /**
   * 带重试的 read-modify-write 操作，Redis 单实例下 SET 是原子的，但 read-modify-write 不是；保留重试以覆盖并发冲突，支持从 mutate 回调返回值
   * @param mutate 读改写回调，传入当前文档数据
   * @returns mutate 回调的返回值
   * @throws 重试耗尽后抛出最后一次错误，非 Error 时抛出 InternalServerError
   * ponytail: 非原子 read-modify-write，3 次重试在高并发写入下仍可能全部失败；升级路径为 Redis WATCH/MULTI 或 Lua 脚本。
   */
  async updateWithRetry<R>(mutate: (data: T) => R): Promise<R> {
    const MAX_RETRIES = 3; // 最大重试次数
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const data = await this.read();
        const result = mutate(data);
        await this.write(data);
        return result;
      } catch (err) {
        lastError = err;
        // 最后一次尝试不再等待
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
        }
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new InternalServerError('更新数据失败（已重试）');
  }
}
