/**
 * @file kv-mock.ts
 * @description KV 存储抽象层：定义 KVAdapter/KVPipeline 契约，提供内存 Mock 与 Upstash Redis 两种实现；getKV 按环境变量择一返回
 */
/**
 * KV 存储适配器契约：抽象出 string/hash/set 与 pipeline 操作，屏蔽底层 Upstash 与内存实现差异
 */
export interface KVAdapter {
  /** 读取字符串键的值，自动尝试 JSON 解析；键不存在返回 null */
  get<T>(key: string): Promise<T | null>;

  /** 写入字符串键（value 为原始字符串） */
  set(key: string, value: string): Promise<void>;

  /** 设置 hash 字段：field 为字符串时配 value，为对象时批量写入；返回新增字段数 */
  hset(key: string, field: string | Record<string, string>, value?: string): Promise<number>;

  /** 读取单个 hash 字段，不存在返回 null */
  hget<T>(key: string, field: string): Promise<T | null>;

  /** 读取整个 hash，键不存在或为空返回 null */
  hgetall<T>(key: string): Promise<T | null>;

  /** 批量读取多个 hash 字段，缺失项按顺序返回 null */
  hmget<T>(key: string, ...fields: string[]): Promise<(T | null)[]>;

  /** 删除 hash 字段，返回实际删除数量 */
  hdel(key: string, ...fields: string[]): Promise<number>;

  /** 向 set 添加成员，返回新增成员数量 */
  sadd(key: string, ...members: string[]): Promise<number>;

  /** 从 set 移除成员，返回移除数量 */
  srem(key: string, ...members: string[]): Promise<number>;

  /** 返回 set 全部成员，键不存在时返回空数组 */
  smembers(key: string): Promise<string[]>;

  /** 创建批量管道，攒下多条写操作后由 exec 统一执行 */
  pipeline(): KVPipeline;

  /**
   * 带版本比对的原子替换（CAS）：仅当当前版本号等于 expectedVersion 时写入新值（含新版本号），并递增版本号。
   * @returns true 表示写入成功；false 表示版本不匹配（并发冲突），调用方应重读重试
   */
  compareAndSet(
    key: string,
    expectedVersion: number,
    nextVersion: number,
    value: string,
  ): Promise<boolean>;

  /**
   * 单往返原子读取「文档 + 版本号」：数据与版本必须来自同一快照，
   * 这是 CAS 读-改-写正确性的前提——分两次请求读取会拿到【旧数据+新版本】的撕裂快照，
   * CAS 比对通过却写回旧数据，静默覆盖他人写入（Upstash REST 多请求下必现，Mock 单线程测不出）。
   * @returns { value, version }；键不存在时 value 为 null、version 为 0
   */
  readWithVersion(key: string): Promise<{ value: string | null; version: number }>;

  /**
   * hash 字段的 CAS 读-改-写原子提交：读 hash 字段 JSON → 就地 mutate → 仅当版本未变时写回。
   * KVAdapter 实现自行保证原子性（MockKV 单线程天然原子；Upstash 用 Lua）。
   * 「字段 + 版本」经单往返读取（getHWithVersion），提交经 compareAndSet 的 hash 版本。
   * @param key hash 键
   * @param field hash 字段（实体 id）
   * @param mutate 返回修改后的新对象；抛错则中止不做任何写入
   * @returns 提交成功返回 true；字段不存在返回 false；版本冲突时自行重试（最多 3 次后返回 false）
   */
  hUpdateCAS<T>(key: string, field: string, mutate: (current: T) => T): Promise<boolean>;

  /**
   * 单往返原子读取「hash 字段 + 版本号」，语义与 readWithVersion 相同（防撕裂快照）。
   * @returns { value, version }；字段不存在时 value 为 null、version 为 0
   */
  getHWithVersion(
    key: string,
    field: string,
  ): Promise<{ value: string | null; version: number }>;

  /**
   * 原子限流：窗口内计数 +1 并返回当前计数；首次计入时设置过期。
   * Upstash 用 Lua 原子实现（多实例共享计数）；Mock 用进程内 Map。
   * @param key 限流键
   * @param windowSeconds 窗口长度（秒），仅首次生效
   * @returns 本次加 1 后的窗口内计数（调用方与 limit 比较判定是否超限）
   */
  rateLimitIncr(key: string, windowSeconds: number): Promise<number>;
}

/**
 * KV 批量写入管道：链式攒操作，exec 时一次性提交，减少往返次数
 */
export interface KVPipeline {
  /** 追加一条字符串写入 */
  set(key: string, value: string): KVPipeline;

  /** 追加一条 hash 写入（单字段配 value，或对象批量） */
  hset(key: string, field: string | Record<string, string>, value?: string): KVPipeline;

  /** 追加一条 hash 删除 */
  hdel(key: string, ...fields: string[]): KVPipeline;

  /** 追加一条 set 添加 */
  sadd(key: string, ...members: string[]): KVPipeline;

  /** 追加一条 set 移除 */
  srem(key: string, ...members: string[]): KVPipeline;

  /** 执行全部已排队操作，返回各操作结果数组 */
  exec(): Promise<unknown[]>;
}

/**
 * KVAdapter 的内存实现：用于本地开发与测试，无 Upstash 配置时由 getKV 兜底返回。
 * 数据结构对齐 Redis 的 string/hash/set 三类语义。
 */
class MockKV implements KVAdapter {
  /** 字符串键值存储 */
  private store = new Map<string, string>();

  /** hash 存储：外层 key → (field → value) */
  private hashes = new Map<string, Map<string, string>>();

  /** set 存储：key → 成员集合 */
  private sets = new Map<string, Set<string>>();

  /** 读取字符串键：优先按 JSON 解析，解析失败退回原始字符串；无值返回 null */
  async get<T>(key: string): Promise<T | null> {
    const val = this.store.get(key);
    if (!val) return null;
    try {
      return JSON.parse(val) as T;
    } catch {
      return val as unknown as T;
    }
  }

  /** 写入字符串键（直接存原始字符串，不做序列化） */
  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  /** 写入 hash 字段（单字段或对象批量），返回本次新增字段数，语义对齐 Redis HSET */
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

  /** 读取单个 hash 字段，键或字段缺失返回 null */
  async hget<T = string>(key: string, field: string): Promise<T | null> {
    const hash = this.hashes.get(key);
    if (!hash) return null;
    const val = hash.get(field);

    return (val as unknown as T) ?? null;
  }

  /** 读取整个 hash 为普通对象，键不存在或字段为空返回 null */
  async hgetall<T = Record<string, string>>(key: string): Promise<T | null> {
    const hash = this.hashes.get(key);
    if (!hash || hash.size === 0) return null;
    const obj: Record<string, string> = {};
    for (const [k, v] of hash) obj[k] = v;
    return obj as T;
  }

  /** 批量读取 hash 字段，缺失项按顺序返回 null；键不存在时全部返回 null */
  async hmget<T = string>(key: string, ...fields: string[]): Promise<(T | null)[]> {
    const hash = this.hashes.get(key);
    if (!hash) return fields.map(() => null);
    return fields.map((f) => {
      const val = hash.get(f);
      return (val as unknown as T) ?? null;
    });
  }

  /** 删除 hash 字段，返回实际删除数量；键不存在返回 0 */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    const hash = this.hashes.get(key);
    if (!hash) return 0;
    let count = 0;
    for (const f of fields) {
      if (hash.delete(f)) count++;
    }
    return count;
  }

  /** 向 set 添加成员，返回新增（此前不存在）成员数量 */
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

  /** 从 set 移除成员，返回实际移除数量；键不存在返回 0 */
  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    let count = 0;
    for (const m of members) {
      if (set.delete(m)) count++;
    }
    return count;
  }

  /** 返回 set 全部成员，键不存在时返回空数组 */
  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  /** 限流计数存储：key → { count, expiresAt }，对齐 Redis INCR+EXPIRE 语义 */
  private rateBuckets = new Map<string, { count: number; expiresAt: number }>();

  /** 版本比对原子替换（CAS）：JS 单线程天然原子，直接比对后写入 */
  async compareAndSet(
    key: string,
    expectedVersion: number,
    nextVersion: number,
    value: string,
  ): Promise<boolean> {
    const current = this.store.get(`__v:${key}`);
    // 无版本号视为 v0：expectedVersion 为 0 时允许写入并初始化版本
    const currentVersion = current === undefined ? 0 : Number(current);
    if (Number.isNaN(currentVersion) || currentVersion !== expectedVersion) return false;
    this.store.set(`__v:${key}`, String(nextVersion));
    this.store.set(key, value);
    return true;
  }

  /** 单往返读取数据+版本：JS 单线程无并发，两次同步读取天然同快照 */
  async readWithVersion(key: string): Promise<{ value: string | null; version: number }> {
    const value = this.store.get(key) ?? null;
    const current = this.store.get(`__v:${key}`);
    const version = current === undefined ? 0 : Number.isNaN(Number(current)) ? 0 : Number(current);
    return { value, version };
  }

  /** 限流计数 +1：窗口过期后重置为 1 并续期，对齐 Redis Lua INCR+EXPIRE 语义 */
  async rateLimitIncr(key: string, windowSeconds: number): Promise<number> {
    const now = Date.now();
    const bucket = this.rateBuckets.get(key);
    if (!bucket || bucket.expiresAt <= now) {
      this.rateBuckets.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
      return 1;
    }
    bucket.count += 1;
    return bucket.count;
  }

  /** hash 字段 CAS 读-改-写：JS 单线程下 read→mutate→write 天然原子，直接执行 */
  async hUpdateCAS<T>(key: string, field: string, mutate: (current: T) => T): Promise<boolean> {
    const hash = this.hashes.get(key);
    const raw = hash?.get(field);
    if (raw === undefined) return false;
    const next = mutate(JSON.parse(raw) as T);
    hash!.set(field, JSON.stringify(next));
    return true;
  }

  /** 单往返读取 hash 字段+版本：JS 单线程无并发，天然同快照 */
  async getHWithVersion(
    key: string,
    field: string,
  ): Promise<{ value: string | null; version: number }> {
    const raw = this.hashes.get(key)?.get(field) ?? null;
    const vkey = `__v:${key}:${field}`;
    const current = this.store.get(vkey);
    const version = current === undefined ? 0 : Number.isNaN(Number(current)) ? 0 : Number(current);
    return { value: raw, version };
  }

  /** 内存管道：将写操作暂存到 ops，exec 时按入队顺序串行执行并收集结果 */
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

/** 借用 globalThis 缓存内存 KV，避免热更新丢失开发期数据 */
const globalForKV = globalThis as unknown as { __mockKV?: MockKV };

/** 进程内共享的 MockKV 单例（首次访问时惰性创建） */
const mockKV = (globalForKV.__mockKV ??= new MockKV());

/**
 * KVAdapter 的 Upstash Redis 实现：包装 @upstash/redis 客户端。
 * 读取方法会将对象/数组等非字符串结果统一序列化为 JSON 字符串，保持与内存实现一致的返回形态。
 */
class UpstashKVAdapter implements KVAdapter {
  /** 底层 Upstash Redis REST 客户端 */
  private client: Redis;

  /**
   * @param client 已配置 url/token 的 Upstash Redis 客户端实例
   */
  constructor(client: Redis) {
    this.client = client;
  }

  /** 读取字符串键，客户端返回 undefined 时统一归一为 null */
  async get<T>(key: string): Promise<T | null> {
    const val = await this.client.get<T>(key);
    return val ?? null;
  }

  /** 写入字符串键 */
  async set(key: string, value: string): Promise<void> {
    await this.client.set(key, value);
  }

  /** 写入 hash 字段：field 为字符串时包成单字段对象，为对象时整体写入；返回新增字段数 */
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

  /** 读取单个 hash 字段，非字符串结果序列化为 JSON 字符串以对齐适配器契约 */
  async hget<T>(key: string, field: string): Promise<T | null> {
    const val = await this.client.hget<unknown>(key, field);
    if (val === null || val === undefined) return null;
    if (typeof val === 'string') return val as unknown as T;
    return JSON.stringify(val) as unknown as T;
  }

  /** 读取整个 hash，逐字段将非字符串值序列化为 JSON 字符串；空/不存在返回 null */
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

  /** 批量读取 hash 字段，缺失按 null、非字符串值序列化为 JSON 字符串，顺序与入参 fields 对齐 */
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

  /** 删除 hash 字段，返回实际删除数量 */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    return await (this.client.hdel as (key: string, ...fields: string[]) => Promise<number>)(
      key,
      ...fields,
    );
  }

  /** 向 set 添加成员，返回新增数量 */
  async sadd(key: string, ...members: string[]): Promise<number> {
    return await (this.client.sadd as (key: string, ...members: string[]) => Promise<number>)(
      key,
      ...members,
    );
  }

  /** 从 set 移除成员，返回移除数量 */
  async srem(key: string, ...members: string[]): Promise<number> {
    return await (this.client.srem as (key: string, ...members: string[]) => Promise<number>)(
      key,
      ...members,
    );
  }

  /** 返回 set 全部成员 */
  async smembers(key: string): Promise<string[]> {
    return await this.client.smembers(key);
  }

  /**
   * 版本比对原子替换（CAS）：Lua 脚本在 Redis 服务端原子执行
   * KEYS[1]=数据键 KEYS[2]=版本键 ARGV[1]=期望版本 ARGV[2]=下一版本 ARGV[3]=新值
   */
  async compareAndSet(
    key: string,
    expectedVersion: number,
    nextVersion: number,
    value: string,
  ): Promise<boolean> {
    // Lua 脚本在 Redis 服务端原子执行：版本不匹配返回 0，匹配则写版本+数据返回 1
    const script = `local v = tonumber(redis.call('GET', KEYS[2]) or '0')
if v ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[2], ARGV[2])
redis.call('SET', KEYS[1], ARGV[3])
return 1`;
    const result = await this.client.eval<[string, string, string], number>(
      script,
      [key, `__v:${key}`],
      [String(expectedVersion), String(nextVersion), value],
    );
    return result === 1;
  }

  /**
   * 单往返读取文档+版本：MGET 一次请求同快照取回两键，杜绝【旧数据+新版本】撕裂快照
   */
  async readWithVersion(key: string): Promise<{ value: string | null; version: number }> {
    const vkey = `__v:${key}`;
    const [value, versionRaw] = await this.client.mget<[string | null, string | null]>(key, vkey);
    const version =
      versionRaw === null || versionRaw === undefined || Number.isNaN(Number(versionRaw))
        ? 0
        : Number(versionRaw);
    return { value: value ?? null, version };
  }

  /** 原子限流：Lua INCR + 首计过期，多实例共享计数 */
  async rateLimitIncr(key: string, windowSeconds: number): Promise<number> {
    const script = `local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return count`;
    return await this.client.eval<[string], number>(script, [key], [String(windowSeconds)]);
  }

  /**
   * hash 字段 CAS 读-改-写：读字段+版本 → 客户端 mutate → Lua 原子比对写回，冲突重试 3 次
   * 「字段+版本」经 getHWithVersion 单往返读取（防撕裂快照），提交经 Lua 原子比对
   */
  async hUpdateCAS<T>(key: string, field: string, mutate: (current: T) => T): Promise<boolean> {
    const script = `local v = tonumber(redis.call('GET', KEYS[2]) or '0')
if v ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[2], ARGV[2])
redis.call('HSET', KEYS[1], KEYS[3], ARGV[3])
return 1`;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { value: json, version } = await this.getHWithVersion(key, field);
      if (json === null) return false;
      let next: T;
      try {
        next = mutate(JSON.parse(json) as T);
      } catch {
        return false; // mutate 抛错视同业务失败，不做写入
      }
      // 字段级版本键：__v:{hashKey}:{field}
      const vkey = `__v:${key}:${field}`;
      const ok = await this.client.eval<[string, string, string], number>(
        script,
        [key, vkey, field],
        [String(version), String(version + 1), JSON.stringify(next)],
      );
      if (ok === 1) return true;
      // 版本冲突：50ms 退避后重读重试
      await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
    }
    return false;
  }

  /**
   * 单往返读取 hash 字段+版本：pipeline 合并 HGET 与版本键 GET 为一次 REST 往返，
   * 同一 pipeline 内命令按序执行、一次性返回，其间不会被其他请求交错写坏配对——
   * 这是与两次独立 REST 请求（旧实现）的关键区别
   * @description 线上事故修复（2026-09-18）：@upstash/redis 的 pipeline().exec() 返回
   *   扁平数组 [hgetResult, getResult]（每命令一个元素），而非「每命令一元组」的嵌套形状。
   *   旧解构 [[, value], [, versionRaw]] 在扁平形状下：hget 的 JSON 字符串被当可迭代对象
   *   解构出单个字符（垃圾值）；版本键首次写入前 Upstash 返回 null，对 null 做数组解构
   *   直接抛 TypeError: null is not iterable（且在 hUpdateCAS 的 try/catch 之外，无人接）
   *   → users 集合所有 CAS 写（登出/改资料/点赞/收藏）全线 500。
   *   本地 MockKV 不走 pipeline 路径，故仅在 Upstash 生产环境暴露。现兼容两种返回形状。
   */
  async getHWithVersion(
    key: string,
    field: string,
  ): Promise<{ value: string | null; version: number }> {
    const vkey = `__v:${key}:${field}`;
    const results = await this.client
      .pipeline()
      .hget(key, field)
      .get(vkey)
      .exec<unknown[]>();
    // 兼容扁平（Upstash 实际）与嵌套（防御性）两种返回形状
    const [first, second] = results as unknown[];
    const value = Array.isArray(first) ? (first[1] as string | null) : (first as string | null);
    const versionRaw = Array.isArray(second)
      ? (second[1] as string | null)
      : (second as string | null);
    const version =
      versionRaw === null || versionRaw === undefined || Number.isNaN(Number(versionRaw))
        ? 0
        : Number(versionRaw);
    return { value: value ?? null, version };
  }

  /** 透传到 Upstash 原生管道；部分命令因客户端类型不全通过 as 断言补齐 */
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

/** 惰性创建的 Upstash 适配器单例，避免每次 getKV 重复 new Redis */
let upstashClient: UpstashKVAdapter | null = null;

/**
 * 获取当前环境的 KV 适配器
 * @returns 配置了 Upstash/Vercel KV 连接信息时返回 Redis 适配器，否则回退到内存 MockKV
 */
export function getKV(): KVAdapter {
  // 兼容 Vercel KV 与 Upstash 两套环境变量命名（Vercel KV 的 KV_URL 实际也指 Upstash REST 端点）
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

  // 生产环境漏配 KV：明确警告（内存实现多实例数据不一致 + 重启全丢），避免静默降级
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[KV] 生产环境未配置 UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN，' +
        '已回退内存实现：数据不跨实例共享且重启即丢，请尽快配置生产 KV',
    );
  }
  // 未配置远端 KV：本地/测试环境回退内存实现
  return mockKV;
}
