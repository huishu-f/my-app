/**
 * @file KV 存储适配层
 * @description 统一的 KV 适配器抽象：配置了 Upstash Redis 环境变量时包装真实客户端，
 *              否则回退到进程内存 mock（数据不持久化，仅适用于开发/测试）。
 *              通过 KVAdapter 接口抹平两种实现的差异，并消除联合类型泛型推断为 unknown 的问题。
 */

/**
 * KV 适配器统一接口
 * @description 约定 get/hset 等命令的统一签名，MockKV 与 @upstash/redis 包装类均实现此接口；
 *              保障上层仓储无需感知底层实现
 */
export interface KVAdapter {
  /** 读取字符串键值，尝试自动反序列化 JSON，不存在时返回 null */
  get<T>(key: string): Promise<T | null>;
  /** 写入字符串值 */
  set(key: string, value: string): Promise<void>;
  /** 设置哈希字段：单字段（field+value）或批量对象，返回新增字段数 */
  hset(key: string, field: string | Record<string, string>, value?: string): Promise<number>;
  /** 读取单个哈希字段，返回原始字符串，不存在时返回 null */
  hget<T>(key: string, field: string): Promise<T | null>;
  /** 读取整个哈希，返回字段名到值的映射，不存在或为空时返回 null */
  hgetall<T>(key: string): Promise<T | null>;
  /** 批量读取多个哈希字段，返回与字段顺序一致的数组，缺失字段为 null */
  hmget<T>(key: string, ...fields: string[]): Promise<(T | null)[]>;
  /** 删除一个或多个哈希字段，返回实际删除数量 */
  hdel(key: string, ...fields: string[]): Promise<number>;
  /** 向集合添加成员，返回实际新增数量 */
  sadd(key: string, ...members: string[]): Promise<number>;
  /** 从集合移除成员，返回实际移除数量 */
  srem(key: string, ...members: string[]): Promise<number>;
  /** 读取集合全部成员，不存在时返回空数组 */
  smembers(key: string): Promise<string[]>;
  /** 创建命令管道，链式入队后 exec 统一执行 */
  pipeline(): KVPipeline;
}

/**
 * KV 命令管道接口
 * @description 命令链式入队，exec 时统一执行并返回各命令结果数组，
 *              用于将多次 KV 往返合并为一次网络请求
 */
export interface KVPipeline {
  /** 追加写入字符串命令 */
  set(key: string, value: string): KVPipeline;
  /** 追加设置哈希字段命令（单字段或批量对象） */
  hset(key: string, field: string | Record<string, string>, value?: string): KVPipeline;
  /** 追加删除哈希字段命令 */
  hdel(key: string, ...fields: string[]): KVPipeline;
  /** 追加集合添加成员命令 */
  sadd(key: string, ...members: string[]): KVPipeline;
  /** 追加集合移除成员命令 */
  srem(key: string, ...members: string[]): KVPipeline;
  /** 按入队顺序依次执行全部命令，返回各命令结果数组 */
  exec(): Promise<unknown[]>;
}

/**
 * 内存版 KV 适配器
 * @description 用 Map/Set 在进程内模拟 @upstash/redis 的行为（含 get 自动 JSON 反序列化）。
 *              仅用于无 Redis 配置时的开发/测试环境，数据存于内存，进程重启即丢失
 */
class MockKV implements KVAdapter {
  /** 字符串键值存储 */
  private store = new Map<string, string>();
  /** 哈希存储：外层 key -> (字段名 -> 值) */
  private hashes = new Map<string, Map<string, string>>();
  /** 集合存储：key -> 成员集合 */
  private sets = new Map<string, Set<string>>();

  /**
   * 读取字符串键
   * @param key 键名
   * @returns 尝试 JSON.parse 后的值；解析失败则返回原始字符串；键不存在时返回 null
   * @description 模拟 @upstash/redis get 的自动反序列化行为，
   *              KVDocumentStore 存入的是 JSON.stringify 后的值，get 需还原为对象
   */
  async get<T>(key: string): Promise<T | null> {
    const val = this.store.get(key);
    if (!val) return null;
    try {
      return JSON.parse(val) as T;
    } catch {
      return val as unknown as T;
    }
  }

  /**
   * 写入字符串值
   * @param key 键名
   * @param value 值，原样存储
   */
  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  /**
   * 设置哈希字段
   * @param key 哈希键名
   * @param field 字段名，或字段名到值的批量映射对象
   * @param value 字段值，field 为字符串时必传
   * @returns 本次实际新增（原不存在）的字段数量
   */
  async hset(key: string, field: string | Record<string, string>, value?: string): Promise<number> {
    if (!this.hashes.has(key)) this.hashes.set(key, new Map());
    const hash = this.hashes.get(key)!;
    if (typeof field === 'string' && value !== undefined) {
      const isNew = !hash.has(field);
      hash.set(field, value);
      return isNew ? 1 : 0;
    }
    if (typeof field === 'object') {
      let count = 0;
      for (const [k, v] of Object.entries(field)) {
        const isNew = !hash.has(k);
        hash.set(k, v);
        if (isNew) count++;
      }
      return count;
    }
    return 0;
  }

  /**
   * 读取哈希字段
   * @param key 哈希键名
   * @param field 字段名
   * @returns 字段的原始字符串值（由调用方自行 JSON.parse），不存在时返回 null
   */
  async hget<T = string>(key: string, field: string): Promise<T | null> {
    const hash = this.hashes.get(key);
    if (!hash) return null;
    const val = hash.get(field);
    // 返回原始字符串，让调用方自行 JSON.parse
    return (val as unknown as T) ?? null;
  }

  /**
   * 读取整个哈希
   * @param key 哈希键名
   * @returns 字段名到原始字符串值的映射对象，哈希不存在或为空时返回 null
   */
  async hgetall<T = Record<string, string>>(key: string): Promise<T | null> {
    const hash = this.hashes.get(key);
    if (!hash || hash.size === 0) return null;
    const obj: Record<string, string> = {};
    for (const [k, v] of hash) obj[k] = v;
    return obj as T;
  }

  /**
   * 批量读取哈希字段
   * @param key 哈希键名
   * @param fields 字段名列表
   * @returns 与 fields 顺序一致的值数组，缺失字段为 null
   */
  async hmget<T = string>(key: string, ...fields: string[]): Promise<(T | null)[]> {
    const hash = this.hashes.get(key);
    if (!hash) return fields.map(() => null);
    return fields.map((f) => {
      const val = hash.get(f);
      return (val as unknown as T) ?? null;
    });
  }

  /**
   * 删除哈希字段
   * @param key 哈希键名
   * @param fields 待删除的字段名列表
   * @returns 实际删除（原本存在）的字段数量
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    const hash = this.hashes.get(key);
    if (!hash) return 0;
    let count = 0;
    for (const f of fields) {
      if (hash.delete(f)) count++;
    }
    return count;
  }

  /**
   * 向集合添加成员
   * @param key 集合键名
   * @param members 待添加的成员列表
   * @returns 实际新增（原本不存在）的成员数量
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    const set = this.sets.get(key)!;
    let count = 0;
    for (const m of members) {
      if (!set.has(m)) {
        set.add(m);
        count++;
      }
    }
    return count;
  }

  /**
   * 从集合移除成员
   * @param key 集合键名
   * @param members 待移除的成员列表
   * @returns 实际移除（原本存在）的成员数量
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    let count = 0;
    for (const m of members) {
      if (set.delete(m)) count++;
    }
    return count;
  }

  /**
   * 读取集合全部成员
   * @param key 集合键名
   * @returns 成员字符串数组，集合不存在时返回空数组
   */
  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  /**
   * 创建内存版命令管道
   * @description 各命令先闭包入队，exec 时按入队顺序逐条执行并收集结果，
   *              行为与 Redis pipeline 对齐（虽无网络批量化收益，但保证接口一致）
   * @returns 管道实例
   */
  pipeline(): KVPipeline {
    const ops: Array<() => Promise<unknown>> = [];
    const pipeline: KVPipeline = {
      set: (key: string, value: string) => {
        ops.push(() => this.set(key, value).then(() => undefined));
        return pipeline;
      },
      hset: (key: string, field: string | Record<string, string>, value?: string) => {
        ops.push(() => this.hset(key, field, value).then(() => undefined));
        return pipeline;
      },
      hdel: (key: string, ...fields: string[]) => {
        ops.push(() => this.hdel(key, ...fields).then(() => undefined));
        return pipeline;
      },
      sadd: (key: string, ...members: string[]) => {
        ops.push(() => this.sadd(key, ...members).then(() => undefined));
        return pipeline;
      },
      srem: (key: string, ...members: string[]) => {
        ops.push(() => this.srem(key, ...members).then(() => undefined));
        return pipeline;
      },
      async exec(): Promise<unknown[]> {
        const results: unknown[] = [];
        for (const op of ops) {
          results.push(await op());
        }
        return results;
      },
    };
    return pipeline;
  }
}

/**
 * globalThis 缓存槽
 * @description 将 mock 实例挂到全局对象，保证 dev 热重载/多模块引用下共享同一份数据
 */
const globalForKV = globalThis as unknown as { __mockKV?: MockKV };
/** mock KV 单例，首次访问时创建并缓存到 globalThis */
const mockKV = (globalForKV.__mockKV ??= new MockKV());

/**
 * Upstash Redis 适配器
 * @description 将 @upstash/redis 客户端包装为 KVAdapter 接口，
 *              关键差异处理：hget/hgetall/hmget 会把 Upstash 自动反序列化后的对象
 *              重新 stringify，保证返回原始 JSON 字符串，与 MockKV 行为一致
 */
class UpstashKVAdapter implements KVAdapter {
  /** @upstash/redis 客户端实例 */
  private client: Redis;

  /**
   * 初始化适配器
   * @param client 已配置好的 @upstash/redis 客户端实例
   */
  constructor(client: Redis) {
    this.client = client;
  }

  /**
   * 读取字符串键
   * @param key 键名
   * @returns Upstash 自动反序列化后的值，不存在时返回 null
   * @description KVDocumentStore 依赖 get 返回反序列化后的对象，行为与 MockKV 对齐
   */
  async get<T>(key: string): Promise<T | null> {
    const val = await this.client.get<T>(key);
    return val ?? null;
  }

  /**
   * 写入字符串值
   * @param key 键名
   * @param value 值
   */
  async set(key: string, value: string): Promise<void> {
    await this.client.set(key, value);
  }

  /**
   * 设置哈希字段
   * @param key 哈希键名
   * @param field 字段名或字段映射对象
   * @param value 字段值，field 为字符串时必传
   * @returns 新增字段数量
   */
  async hset(key: string, field: string | Record<string, string>, value?: string): Promise<number> {
    if (typeof field === 'string' && value !== undefined) {
      const result = await this.client.hset(key, { [field]: value });
      return result;
    }
    if (typeof field === 'object') {
      const result = await this.client.hset(key, field);
      return result;
    }
    return 0;
  }

  /**
   * 读取哈希字段
   * @param key 哈希键名
   * @param field 字段名
   * @returns 原始 JSON 字符串，不存在时返回 null
   * @description Upstash hget 会自动反序列化 value，而 KVRepository.findById 期望
   *              拿到原始 JSON 字符串自行 parse，因此这里把对象重新 stringify 还原
   */
  async hget<T>(key: string, field: string): Promise<T | null> {
    const val = await this.client.hget<unknown>(key, field);
    if (val === null || val === undefined) return null;
    if (typeof val === 'string') return val as unknown as T;
    return JSON.stringify(val) as unknown as T;
  }

  /**
   * 读取整个哈希
   * @param key 哈希键名
   * @returns 字段名到原始 JSON 字符串的映射，哈希不存在时返回 null
   * @description Upstash hgetall 自带反序列化（会把 [k1,v1,...] 转成 { k1: JSON.parse(v1) }），
   *              这里逐个 stringify 还原为 Record<string, string>，与 MockKV 返回结构一致
   */
  async hgetall<T>(key: string): Promise<T | null> {
    const val = await (
      this.client.hgetall as (key: string) => Promise<Record<string, unknown> | null>
    )(key);
    if (!val) return null;
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(val)) {
      result[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    return result as unknown as T;
  }

  /**
   * 批量读取哈希字段
   * @param key 哈希键名
   * @param fields 字段名列表
   * @returns 与 fields 顺序一致的原始字符串数组，缺失字段为 null
   * @description Upstash hmget 返回 { field: 反序列化值 } 对象而非数组，
   *              这里按 fields 顺序取出并 stringify 还原为数组，与 MockKV 对齐
   */
  async hmget<T>(key: string, ...fields: string[]): Promise<(T | null)[]> {
    const val = await (
      this.client.hmget as (
        key: string,
        ...fields: string[]
      ) => Promise<Record<string, unknown> | null>
    )(key, ...fields);
    if (!val) return fields.map(() => null);
    return fields.map((f) => {
      const v = val[f];
      if (v === null || v === undefined) return null;
      if (typeof v === 'string') return v as unknown as T;
      return JSON.stringify(v) as unknown as T;
    });
  }

  /**
   * 删除哈希字段
   * @param key 哈希键名
   * @param fields 字段名列表
   * @returns 删除的字段数量
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    return await (this.client.hdel as (key: string, ...fields: string[]) => Promise<number>)(
      key,
      ...fields,
    );
  }

  /**
   * 向集合添加成员
   * @param key 集合键名
   * @param members 成员列表
   * @returns 新增成员数量
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    return await (this.client.sadd as (key: string, ...members: string[]) => Promise<number>)(
      key,
      ...members,
    );
  }

  /**
   * 从集合移除成员
   * @param key 集合键名
   * @param members 成员列表
   * @returns 移除成员数量
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    return await (this.client.srem as (key: string, ...members: string[]) => Promise<number>)(
      key,
      ...members,
    );
  }

  /**
   * 读取集合全部成员
   * @param key 集合键名
   * @returns 成员字符串数组
   */
  async smembers(key: string): Promise<string[]> {
    return await this.client.smembers(key);
  }

  /**
   * 创建 Redis 命令管道
   * @description 基于 @upstash/redis 原生 pipeline 包装为 KVPipeline，
   *              支持一次网络往返批量执行多条命令
   * @returns 管道实例
   */
  pipeline(): KVPipeline {
    const pipe = this.client.pipeline();
    const pipeline: KVPipeline = {
      set(key: string, value: string) {
        pipe.set(key, value);
        return pipeline;
      },
      hset(key: string, field: string | Record<string, string>, value?: string) {
        if (typeof field === 'string' && value !== undefined) {
          pipe.hset(key, { [field]: value });
        } else if (typeof field === 'object') {
          pipe.hset(key, field);
        }
        return pipeline;
      },
      hdel(key: string, ...fields: string[]) {
        (pipe as { hdel: (key: string, ...fields: string[]) => void }).hdel(key, ...fields);
        return pipeline;
      },
      sadd(key: string, ...members: string[]) {
        (pipe as { sadd: (key: string, ...members: string[]) => void }).sadd(key, ...members);
        return pipeline;
      },
      srem(key: string, ...members: string[]) {
        (pipe as { srem: (key: string, ...members: string[]) => void }).srem(key, ...members);
        return pipeline;
      },
      async exec(): Promise<unknown[]> {
        return await pipe.exec();
      },
    };
    return pipeline;
  }
}

import { Redis } from '@upstash/redis';

/** 全局复用的 Upstash 适配器实例，未初始化时为 null */
let upstashClient: UpstashKVAdapter | null = null;

/**
 * 获取 KV 适配器单例
 * @description 读取 Upstash Redis 环境变量（KV_URL / KV_REST_API_TOKEN 或
 *              UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN），
 *              配置齐全时返回包装的 Upstash 适配器（进程内只创建一次），
 *              否则回退到内存 mock（仅适用于开发/测试）
 * @returns KV 适配器实例
 * @example
 * const kv = getKV();
 */
export function getKV(): KVAdapter {
  // 优先使用 Upstash Redis（生产环境）
  const kvUrl = process.env.KV_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (kvUrl && kvToken) {
    if (!upstashClient) {
      upstashClient = new UpstashKVAdapter(
        new Redis({
          url: kvUrl,
          token: kvToken,
        }),
      );
    }
    return upstashClient;
  }
  // 本地开发使用 mock
  return mockKV;
}
