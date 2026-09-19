/**
 * @file kv-store.ts
 * @description 单文档 KV 存储：以固定键读写整份 JSON 文档，提供基于版本号 CAS 的读-改-写更新，并发冲突时以最新快照重试
 */
import 'server-only';
import { getKV } from './kv-mock';
import { isAppError, InternalServerError } from '@server/errors';

/**
 * 单文档 KV 存储：整个集合以一条 string 键保存，读取时反序列化为对象。
 * 写路径带版本号 CAS（乐观并发控制）：读时记录版本，写前原子比对版本，不匹配视为并发冲突并重试。
 * @template T 文档的数据结构类型
 */
export class KVDocumentStore<T> {
  /** 该文档在 KV 中的 string 键名 */
  private readonly key: string;

  /** 键不存在（读取返回 null）时使用的默认值 */
  private readonly defaultValue: T;

  /**
   * @param key 文档在 KV 中的 string 键名
   * @param defaultValue 读取不到数据时返回的默认文档值
   */
  constructor(key: string, defaultValue: T) {
    this.key = key;
    this.defaultValue = defaultValue;
  }

  /**
   * 读取文档
   * @returns 反序列化后的文档；键不存在时返回构造时传入的 defaultValue
   * @throws 底层读取异常时抛出 InternalServerError
   */
  async read(): Promise<T> {
    try {
      const kv = getKV();
      const data = await kv.get<T>(this.key);
      if (data === null) return this.defaultValue;
      return data;
    } catch (err) {
      // 必须带上底层原因：这里原先是裸 catch，把 Upstash 连接/鉴权/序列化错误的真实原因整个丢掉，
      // 线上只留下一句「读取数据失败」，故障无从定位（面向客户端的仍是通用文案，见 sendError）。
      // 5xx 的 message 不会透给客户端，因此可以放心携带内部细节。
      throw new InternalServerError(
        `读取数据失败: ${this.key} — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * 写入文档（整体序列化后覆盖写入），并递增版本号
   * @throws 底层写入异常或 CAS 冲突重试耗尽时抛出 InternalServerError
   */
  async write(data: T): Promise<void> {
    // 与 updateWithRetry 相同的 CAS 重试：读版本→比对写入，冲突时以最新版本重试
    const MAX_RETRIES = 3;
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const kv = getKV();
        const { version } = await kv.readWithVersion(this.key);
        const ok = await kv.compareAndSet(
          this.key,
          version,
          version + 1,
          JSON.stringify(data),
        );
        if (ok) return;
        throw new InternalServerError(`并发冲突: ${this.key}`);
      } catch (err) {
        lastError = err;
        // 业务错误（403/404/409…）立刻透传，重试只会得到相同结果。
        // 用 isAppError 而非裸 instanceof：错误类被 Turbopack 分包后 instanceof 跨 chunk 恒为 false，
        // 会让业务错误被误判成可重试错误（多跑 2 轮 + 150ms 无谓退避）
        if (isAppError(err) && err.statusCode !== 500) throw err;
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
        }
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new InternalServerError(`写入数据失败: ${this.key}`);
  }

  /**
   * 带并发冲突检测的读-改-写更新（CAS 乐观锁）
   *
   * 每轮：单往返读取「文档+版本」（readWithVersion，数据与版本同快照）→ mutate 就地修改
   * → CAS 写入（版本不匹配即并发冲突）。冲突时以最新快照重跑 mutate；
   * mutate 抛出的业务错误（AppError，如 403/404）直接透传不重试。
   *
   * @param mutate 就地修改读到的文档，返回值将作为本方法结果回传
   * @returns mutate 的返回值
   * @throws 超过最大重试仍冲突/失败时抛出最后一次错误（若为 Error）或 InternalServerError；mutate 抛出的业务错误直接透传
   * @template R mutate 的返回类型
   */
  async updateWithRetry<R>(mutate: (data: T) => R): Promise<R> {
    // 最多尝试次数为 3 次；每轮冲突线性等待 50ms*(attempt+1)
    const MAX_RETRIES = 3;
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const kv = getKV();
        // 关键：数据与版本必须出自同一往返。分两次请求读会拿到【旧数据+新版本】的
        // 撕裂快照，CAS 比对通过却写回旧数据——并发写静默丢失（仅多请求的远程 KV 可复现）
        const { value, version } = await kv.readWithVersion(this.key);
        const data: T = value === null ? this.defaultValue : (JSON.parse(value) as T);
        const result = mutate(data);
        const ok = await kv.compareAndSet(
          this.key,
          version,
          version + 1,
          JSON.stringify(data),
        );
        if (!ok) {
          // 版本不匹配 = 并发写冲突，以最新快照重试
          throw new InternalServerError(`并发冲突: ${this.key}`);
        }
        return result;
      } catch (err) {
        lastError = err;

        // 业务错误（NotFound/Forbidden/Validation...）立刻透传，重试只会得到相同结果
        if (isAppError(err) && err.statusCode !== 500) {
          throw err;
        }

        // 未到最后一轮则线性退避：第 attempt 次失败后等待 50*(attempt+1) 毫秒
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
        }
      }
    }
    // 优先抛出原始 Error，否则包装为统一的 InternalServerError
    throw lastError instanceof Error
      ? lastError
      : new InternalServerError('更新数据失败（已重试）');
  }
}
