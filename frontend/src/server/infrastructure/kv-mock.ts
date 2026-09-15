/**
 * @file kv-mock.ts
 * @description KV 适配层，无 Upstash Redis 环境变量时使用内存 mock，生产环境包装 @upstash/redis；仅用于开发/测试
 */

/**
 * KV 适配器统一接口，MockKV 和 @upstash/redis 均需实现此接口
 * @description 统一 get/hset 等命令签名，解决联合类型泛型方法调用时 TS 推断为 unknown 的问题
 */
export interface KVAdapter {
  /** 读取键值，自动反序列化 JSON，不存在时返回 null */
  get<T>(key: string): Promise<T | null>;
  /** 写入字符串值 */
  set(key: string, value: string): Promise<void>;
  /** 设置哈希字段，支持单字段或批量对象，返回新增字段数 */
  hset(key: string, field: string | Record<string, string>, value?: string): Promise<number>;
  /** 读取哈希字段值 */
  hget<T>(key: string, field: string): Promise<T | null>;
  /** 读取整个哈希，返回字段映射 */
  hgetall<T>(key: string): Promise<T | null>;
  /** 批量读取多个哈希字段 */
  hmget<T>(key: string, ...fields: string[]): Promise<(T | null)[]>;
  /** 删除哈希字段，返回删除数量 */
  hdel(key: string, ...fields: string[]): Promise<number>;
  /** 向集合添加成员，返回新增数量 */
  sadd(key: string, ...members: string[]): Promise<number>;
  /** 从集合移除成员，返回移除数量 */
  srem(key: string, ...members: string[]): Promise<number>;
  /** 读取集合全部成员 */
  smembers(key: string): Promise<string[]>;
  /** 创建命令管道，统一批量执行 */
  pipeline(): KVPipeline;
}

/**
 * KV 命令管道接口
 * @description 命令链式入队，exec 时统一执行，返回各命令结果数组
 */
export interface KVPipeline {
  /** 追加写入字符串命令 */
  set(key: string, value: string): KVPipeline;
  /** 追加设置哈希字段命令 */
  hset(key: string, field: string | Record<string, string>, value?: string): KVPipeline;
  /** 追加删除哈希字段命令 */
  hdel(key: string, ...fields: string[]): KVPipeline;
  /** 追加集合添加成员命令 */
  sadd(key: string, ...members: string[]): KVPipeline;
  /** 追加集合移除成员命令 */
  srem(key: string, ...members: string[]): KVPipeline;
  /** 依次执行全部命令，返回各命令结果 */
  exec(): Promise<unknown[]>;
}

/**
 * 内存版 KV 适配器
 * @description 使用 Map 模拟 @upstash/redis 的自动反序列化行为，数据仅存于进程内存、重启即丢失，仅用于开发/测试
 */
class MockKV implements KVAdapter {
  /** 字符串键值存储 */
  private store = new Map<string, string>();
  /** 哈希存储，外层键为哈希名 */
  private hashes = new Map<string, Map<string, string>>();
  /** 集合存储 */
  private sets = new Map<string, Set<string>>();

  /**
   * 读取字符串键，尝试解析为 JSON
   * @param key 键名
   * @returns 反序列化后的值，不存在时返回 null
   */
  async get<T>(key: string): Promise<T | null> {
    const val = this.store.get(key);
    if (!val) return null;
    // KVDocumentStore 存储的是 JSON.stringify 后的值，get 应返回原始字符串让调用方解析
    // 但 @upstash/redis 的 get 会自动反序列化，所以我们模拟该行为
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
   * @param field 字段名或字段映射对象
   * @param value 字段值，field 为字符串时必传
   * @returns 新增字段数量
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
   * 读取哈希字段值
   * @param key 哈希键名
   * @param field 字段名
   * @returns 字段原始字符串值，不存在时返回 null
   */
  async hget<T = string>(key: string, field: string): Promise<T | null> {
    const hash = this.hashes.get(key);
    if (!hash) return null;
    const val = hash.get(field);
    // 返回原始字符串，让调用方自行 JSON.parse
    return (val as unknown as T) ?? null;
  }

  /**
   * 读取整个哈希全部字段
   * @param key 哈希键名
   * @returns 字段映射对象，哈希不存在或为空时返回 null
   */
  async hgetall<T = Record<string, string>>(key: string): Promise<T | null> {
    const hash = this.hashes.get(key);
    if (!hash || hash.size === 0) return null;
    const obj: Record<string, string> = {};
    for (const [k, v] of hash) obj[k] = v;
    return obj as T;
  }

  /**
   * 批量读取多个哈希字段
   * @param key 哈希键名
   * @param fields 字段名列表
   * @returns 与字段顺序一致的值数组，缺失字段为 null
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
   * @param fields 字段名列表
   * @returns 实际删除的字段数量
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
   * @param members 成员列表
   * @returns 实际新增的成员数量
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
   * @param members 成员列表
   * @returns 实际移除的成员数量
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
   * @returns 成员数组，集合不存在时返回空数组
   */
  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  /**
   * 创建内存管道，命令先入队、exec 时按序执行
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
 * 挂在 globalThis 上，确保 dev 模式下跨模块实例共享
 */
const globalForKV = globalThis as unknown as { __mockKV?: MockKV };
/** mock KV 单例，未初始化时创建 */
const mockKV = (globalForKV.__mockKV ??= new MockKV());

/**
 * Upstash Redis 适配器
 * @description 将 @upstash/redis 客户端包装为 KVAdapter 接口，保证与 MockKV 一致的返回行为
 */
class UpstashKVAdapter implements KVAdapter {
  /** @upstash/redis 客户端实例 */
  private client: Redis;

  /**
   * 初始化适配器
   * @param client @upstash/redis 客户端实例
   */
  constructor(client: Redis) {
    this.client = client;
  }

  /**
   * 读取字符串键
   * @param key 键名
   * @returns 反序列化后的值，不存在时返回 null
   */
  async get<T>(key: string): Promise<T | null> {
    // Upstash get 默认会自动反序列化 JSON，与 MockKV 行为一致
    // KVDocumentStore 依赖 get 返回反序列化后的对象
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
   * 读取哈希字段值
   * @param key 哈希键名
   * @param field 字段名
   * @returns 原始 JSON 字符串，不存在时返回 null
   */
  async hget<T>(key: string, field: string): Promise<T | null> {
    // Upstash hget 默认会自动反序列化 value
    // KVRepository.findById 期望 hget 返回原始 JSON 字符串，然后自己 JSON.parse
    // 所以需要把反序列化后的对象重新 stringify
    const val = await this.client.hget<unknown>(key, field);
    if (val === null || val === undefined) return null;
    if (typeof val === 'string') return val as unknown as T;
    return JSON.stringify(val) as unknown as T;
  }

  /**
   * 读取整个哈希
   * @param key 哈希键名
   * @returns 字段名到原始 JSON 字符串的映射，哈希不存在时返回 null
   */
  async hgetall<T>(key: string): Promise<T | null> {
    // Upstash hgetall 自带 deserialize4，会把 [k1,v1,k2,v2,...] 转成 {k1: JSON.parse(v1), ...}
    // 我们需要返回 Record<string, string>（原始 JSON 字符串），与 MockKV 一致
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
   * 批量读取多个哈希字段
   * @param key 哈希键名
   * @param fields 字段名列表
   * @returns 与字段顺序一致的原始字符串数组，缺失字段为 null
   */
  async hmget<T>(key: string, ...fields: string[]): Promise<(T | null)[]> {
    // Upstash hmget 的 deserialize5 返回 { field: JSON.parse(value) } 对象，不是数组
    // 我们需要返回 (T | null)[]，与 MockKV 一致（数组，每个元素是原始字符串或 null）
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
   * @returns 删除数量
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
   * @returns 新增数量
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
   * @returns 移除数量
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
   * @returns 成员数组
   */
  async smembers(key: string): Promise<string[]> {
    return await this.client.smembers(key);
  }

  /**
   * 创建 Redis 管道
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
 * @description 配置了 Upstash Redis 环境变量时返回真实适配器，否则回退内存 mock
 * @returns KV 适配器实例
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
