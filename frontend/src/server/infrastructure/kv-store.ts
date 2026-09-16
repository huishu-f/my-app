/**
 * @file KV 文档存储
 * @description 以单个 KV 键保存整份文档对象，提供读取、整体写入与带重试的读改写操作。
 *              引入 'server-only' 保证仅服务端使用。
 */
import 'server-only';
import { getKV } from './kv-mock';
import { InternalServerError } from '@server/errors';

/**
 * KV 文档存储
 * @description 用于存储单一文档对象（如整站配置、BlogDB）：read 时反序列化，
 *              write 时 JSON.stringify 整体覆盖（SET 原子操作，无需文件锁/写队列）。
 *              依赖 KVAdapter 的 get 自动反序列化行为。泛型 T 为文档对象类型
 */
export class KVDocumentStore<T> {
  /** 文档存储键名 */
  private readonly key: string;
  /** 键不存在时返回的默认文档值 */
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
   * @returns 反序列化后的文档数据，键不存在时返回构造时传入的默认值
   * @throws KV 读取抛错时抛出 InternalServerError
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
   * 写入文档
   * @description 将文档 JSON.stringify 后整体覆盖原值
   * @param data 待写入的文档数据
   * @throws KV 写入抛错时抛出 InternalServerError
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
   * 带重试的读改写操作
   * @description 先 read，再执行 mutate 得到结果并写入，失败时退避重试（最多 3 次）。
   *              Redis 单实例下 SET 原子，但 read-modify-write 整体不原子，
   *              重试用于覆盖并发写入冲突。支持透传 mutate 的返回值
   * @param mutate 变更回调：接收当前文档，返回任意结果（写入的是变更后的同一文档对象）
   * @returns mutate 回调的返回值
   * @throws 重试耗尽后抛出最后一次错误；非 Error 抛出物抛 InternalServerError
   * ponytail: 非原子 read-modify-write，3 次重试在高并发写入下仍可能全部失败；
   *           升级路径：Redis WATCH/MULTI 或 Lua 脚本。
   * @example
   * const count = await store.updateWithRetry((db) => { db.n++; return db.n; });
   */
  async updateWithRetry<R>(mutate: (data: T) => R): Promise<R> {
    /** 最大尝试次数 */
    const MAX_RETRIES = 3;
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const data = await this.read();
        const result = mutate(data);
        await this.write(data);
        return result;
      } catch (err) {
        lastError = err;
        // 非最后一次尝试时指数退避后重试（50ms → 100ms）
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
