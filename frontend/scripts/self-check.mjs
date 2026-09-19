/**
 * @file self-check.mjs
 * @description 服务端核心逻辑自检：CAS 并发写、mutate 业务错误透传、限流。
 * 用 node:assert 做可运行验证：node scripts/self-check.mjs，全过则退出码 0。
 */
import assert from 'node:assert/strict';

// ---- 直接内联复刻 KVDocumentStore 的 CAS 语义（运行时无需 ts 编译）----
// KVAdapter 接口的最小实现：模拟 Redis 的 string 键 + 版本键
class MiniKV {
  constructor() {
    this.store = new Map(); // key -> string（版本以 __v:key 存储，与实现一致）
    this.interleave = null; // 并发注入点：CAS 前挂起让位给其他写
  }
  async get(key) {
    const v = this.store.get(key);
    if (v === undefined) return null;
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  async getVersion(key) {
    const v = this.store.get(`__v:${key}`);
    return v === undefined ? 0 : Number(v);
  }
  // 新实现：数据+版本同一往返返回（返回原始字符串，与真实 adapter 契约一致）
  async readWithVersion(key) {
    const value = this.store.get(key) ?? null;
    return { value, version: await this.getVersion(key) };
  }
  async compareAndSet(key, expected, next, value) {
    if (this.interleave) {
      const hook = this.interleave;
      this.interleave = null;
      await hook(); // 模拟读后被并发抢先写
    }
    const cur = await this.getVersion(key);
    if (cur !== expected) return false;
    this.store.set(`__v:${key}`, String(next));
    this.store.set(key, value);
    return true;
  }
}

// 与 KVDocumentStore.updateWithRetry 相同的算法（不含 server-only / AppError，用标记错误类替代）
class BusinessError extends Error {}
class InfraError extends Error {}
class DocStore {
  constructor(kv, key, defaultValue) {
    this.kv = kv;
    this.key = key;
    this.defaultValue = defaultValue;
  }
  async read() {
    const { value } = await this.kv.readWithVersion(this.key);
    return value === null ? this.defaultValue : JSON.parse(value);
  }
  async updateWithRetry(mutate) {
    const MAX_RETRIES = 3;
    let lastError;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // 关键：数据与版本出自同一往返（readWithVersion），不存在旧实现的【旧数据+新版本】撕裂窗口
        const { value, version } = await this.kv.readWithVersion(this.key);
        const data = value === null ? this.defaultValue : JSON.parse(value);
        const result = mutate(data);
        const ok = await this.kv.compareAndSet(
          this.key,
          version,
          version + 1,
          JSON.stringify(data),
        );
        if (!ok) throw new InfraError('concurrent-conflict');
        return result;
      } catch (err) {
        lastError = err;
        // 业务错误立即透传，不重试
        if (err instanceof BusinessError) throw err;
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, 5));
        }
      }
    }
    throw lastError;
  }
}

// ---- 用例 0：撕裂读回归 ----
// 场景模拟 Upstash REST 两次独立请求的旧实现：A 读到旧数据后、读到版本前，B 完成了一轮写。
// KV 侧 tornGet/tornVer 两个钩子分别在该"两段式读"的间隙放行并发写。
// 验证：旧算法（读数据/读版本两次往返）在此交错下必丢数据（对照组，先证缺陷存在）；
//       新算法（单往返）不存在该间隙，B 的写入不丢（实验组）。
{
  // KV 侧增加两段式读钩子：为旧算法提供撕裂窗口
  class TornKV extends MiniKV {
    constructor() {
      super();
      this.tornGet = null; // 旧算法读完数据后、未读版本时的注入点
    }
  }

  // 旧算法对照：数据与版本分两次"请求"读取
  async function legacyUpdateWithRetry(kv, key, defaultValue, mutate) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const value = kv.store.get(key) ?? null; // 请求1：读数据
      const data = value === null ? defaultValue : JSON.parse(value);
      const result = mutate(data);
      if (kv.tornGet) {
        const hook = kv.tornGet;
        kv.tornGet = null;
        await hook(); // 窗口：B 的写插进两段读之间
      }
      const version = await kv.getVersion(key); // 请求2：读版本（可能已过期）
      const ok = await kv.compareAndSet(key, version, version + 1, JSON.stringify(data));
      if (ok) return result;
    }
    throw new Error('legacy retries exhausted');
  }

  // —— 对照组：旧算法必丢 B 的写入（证明该模拟能捕获真实缺陷）——
  {
    const kv = new TornKV();
    kv.store.set('torn:db', JSON.stringify({ views: 1 }));
    kv.store.set('__v:torn:db', '1'); // v1
    const pA = legacyUpdateWithRetry(kv, 'torn:db', { views: 0 }, (db) => {
      db.views += 10;
    });
    kv.tornGet = async () => {
      // B 抢先完整写一轮：v1 -> v2, views=100
      kv.store.set('torn:db', JSON.stringify({ views: 100 }));
      kv.store.set('__v:torn:db', '2');
    };
    await pA;
    const final = JSON.parse(kv.store.get('torn:db'));
    assert.equal(
      final.views,
      11,
      `对照组应复现旧缺陷（B 的 100 被 A 的旧快照吞掉得 11），实际 ${final.views}——模拟失效，需检查`,
    );
  }

  // —— 实验组：新算法（readWithVersion 单往返）在同样交错下不丢 ——
  {
    const kv = new TornKV();
    const store = new DocStore(kv, 'torn:db', { views: 0 });
    await store.updateWithRetry((db) => {
      db.views = 1;
    }); // v1
    const pA = store.updateWithRetry((db) => {
      db.views += 10;
    });
    // A 的数据+版本在同一往返内已一同取回，B 只能在 CAS 前写（interleave 钩子），
    // 此时 A 的版本已过期，CAS 必失败并带最新快照重试
    kv.interleave = async () => {
      const store2 = new DocStore(kv, 'torn:db', { views: 0 });
      await store2.updateWithRetry((db) => {
        db.views = 100; // v1 -> v2（注意 B 基于 v1 最新快照，不是从 0 覆盖）
      });
    };
    await pA;
    const final = await store.read();
    assert.equal(
      final.views,
      110,
      `撕裂读回归失败：期望 110，实际 ${final.views}（若为 11 说明数据/版本又被拆开读取）`,
    );
  }
  console.log('✓ 用例0 撕裂读回归：旧两段式读在该交错下丢 B 的写入；单往返实现不丢');
}

// ---- 用例 1：并发读-改-写不再丢数据（read A / read B / write B / write A 的经典丢更场景）----
{
  const kv = new MiniKV();
  const store = new DocStore(kv, 'blog:db', { views: 0 });
  // 首次写入建立 v1
  await store.updateWithRetry((db) => {
    db.views = 1;
  });

  // 模拟竞态：请求 A 读完（v1）后，B 抢先完成一次写（v1→v2）
  let aFinished = false;
  const pA = store.updateWithRetry((db) => {
    db.views += 10; // 基于 v1 的快照
    return 'A';
  });
  // 注入：A 的 readWithVersion 已拿到 v1，在 CAS 前让 B 完整写一轮
  kv.interleave = async () => {
    const store2 = new DocStore(kv, 'blog:db', { views: 0 });
    await store2.updateWithRetry((db) => {
      db.views = 100; // v1 -> v2
    });
  };
  await pA;
  aFinished = true;
  const final = await store.read();
  // 旧实现：A 直接以 v1 快照覆盖 → views=11（B 的 100 被吞）。
  // 新实现：A 的 CAS 失败 → 重读 v2 → 再算 → 100+10
  assert.equal(final.views, 110, `并发写丢失：期望 110，实际 ${final.views}（B 的写入被 A 吞掉）`);
  assert.ok(aFinished);
  console.log('✓ 用例1 CAS 并发写：B 的写入不再被 A 覆盖（views=110）');
}

// ---- 用例 2：mutate 抛业务错误（404/403）直接透传，不产生 3 次重试 ----
{
  const kv = new MiniKV();
  const store = new DocStore(kv, 'blog:db', { posts: [] });
  await store.updateWithRetry((db) => {
    db.posts.push('seed');
  });

  let mutateCalls = 0;
  await assert.rejects(
    () =>
      store.updateWithRetry(() => {
        mutateCalls++;
        throw new BusinessError('文章不存在'); // 模拟业务校验失败（如 findIndex===-1）
      }),
    (err) => err instanceof BusinessError && err.message === '文章不存在',
  );
  assert.equal(mutateCalls, 1, `业务错误被重试了 ${mutateCalls} 次（期望 1 次：不重试）`);
  console.log('✓ 用例2 业务错误透传：404/403 不再触发重试与全库重读');
}

// ---- 用例 3：版本链单调，连续写不互相回退 ----
{
  const kv = new MiniKV();
  const store = new DocStore(kv, 'k', { n: 0 });
  for (let i = 1; i <= 5; i++) {
    await store.updateWithRetry((db) => {
      db.n = i;
    });
  }
  assert.equal((await store.read()).n, 5);
  assert.equal(await kv.getVersion('k'), 5);
  console.log('✓ 用例3 版本链：连续 5 次写后版本=5、终值=5');
}

// ---- 用例 4：hash 字段 CAS —— 并发 stats 增量不丢 ----
{
  // MiniKV 补 hash 语义：单线程执行 hUpdateCAS 天然原子
  class HashKV extends MiniKV {
    constructor() {
      super();
      this.hashes = new Map();
    }
    hget(key, field) {
      return this.hashes.get(key)?.get(field) ?? null;
    }
    hUpdateCAS(key, field, mutate) {
      const hash = this.hashes.get(key);
      const raw = hash?.get(field);
      if (raw === undefined) return Promise.resolve(false);
      const next = mutate(JSON.parse(raw));
      hash.set(field, JSON.stringify(next));
      return Promise.resolve(true);
    }
  }
  const kv = new HashKV();
  // 两个"请求"基于同一初始快照算增量（views=0），如果各自 +1 后串行覆盖，终值只会是 1（丢一次）
  const base = { stats: { articles: 0, likes: 0, views: 0 } };
  kv.hashes.set('users', new Map([['u1', JSON.stringify(base)]]));

  const inc = () =>
    kv.hUpdateCAS('users', 'u1', (u) => ({
      ...u,
      stats: { ...u.stats, views: u.stats.views + 1 }, // mutate 时才读最新值
    }));
  // 并发 10 次：原子 mutate 基于每次提交后的最新快照，终值必须是 10
  await Promise.all(Array.from({ length: 10 }, inc));
  const final = JSON.parse(kv.hashes.get('users').get('u1'));
  assert.equal(final.stats.views, 10, `并发增量丢失：期望 10，实际 ${final.stats.views}`);
  console.log('✓ 用例4 用户 stats 原子增量：并发 10 次 +1 终值=10（旧实现会丢更新）');
}

// ---- 用例 5：关联列表原子切换 —— 并发双击只切换一次 ----
{
  class HashKV extends MiniKV {
    constructor() {
      super();
      this.hashes = new Map();
    }
    hUpdateCAS(key, field, mutate) {
      const hash = this.hashes.get(key);
      const raw = hash?.get(field);
      if (raw === undefined) return Promise.resolve(false);
      const next = mutate(JSON.parse(raw));
      hash.set(field, JSON.stringify(next));
      return Promise.resolve(true);
    }
  }
  const kv = new HashKV();
  kv.hashes.set('users', new Map([['u1', JSON.stringify({ likedArticles: [] })]]));

  let toggles = 0;
  const toggle = () =>
    kv.hUpdateCAS('users', 'u1', (u) => {
      toggles++;
      const wasPresent = u.likedArticles.includes('p1');
      return {
        ...u,
        likedArticles: wasPresent
          ? u.likedArticles.filter((p) => p !== 'p1')
          : [...u.likedArticles, 'p1'],
      };
    });
  // 同一用户对同一文章并发双击：toggle 语义下两次提交串行执行，净效应回到空列表。
  // 关键点：两次都基于"提交时刻的最新快照"判断（第二次看到 p1 已存在 → 删除），
  // 旧实现的读-改-写两个都读到空列表 → 双双执行"加入" → 列表去重后仍为 ['p1']，计数却 +2，造成两侧不一致。
  await Promise.all([toggle(), toggle()]);
  const final = JSON.parse(kv.hashes.get('users').get('u1'));
  assert.deepEqual(
    final.likedArticles,
    [],
    `并发双击结果异常: ${JSON.stringify(final.likedArticles)}`,
  );
  assert.equal(toggles, 2, '两次切换应各自提交一次');
  console.log('✓ 用例5 关联列表原子切换：并发双击净效应回空（计数与列表保持一致，不会 +2）');
}

// ---- 用例 6：redirect 安全校验与 locale 前缀剥离（复刻 lib/navigation.ts 的 safeRedirect/stripLocalePrefix）----
{
  const LOCALE_PREFIXES = ['/zh', '/en'];
  function stripLocalePrefix(path) {
    for (const prefix of LOCALE_PREFIXES) {
      if (path === prefix) return '/';
      if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length) || '/';
    }
    return path;
  }
  function safeRedirect(raw) {
    const bare = stripLocalePrefix(raw);
    const ok =
      bare.startsWith('/') && !bare.startsWith('//') && !['/login', '/register'].includes(bare);
    return ok ? raw : '/';
  }
  // 前缀剥离：完整路径与语言根各归一为裸路径
  assert.equal(stripLocalePrefix('/zh/write'), '/write');
  assert.equal(stripLocalePrefix('/en'), '/');
  assert.equal(stripLocalePrefix('/posts?a=1'), '/posts?a=1'); // 无前缀原样
  // safeRedirect 路径合法性按剥前缀后的裸路径判定，返回值保留原样（供原生跳转）
  assert.equal(safeRedirect('/zh/write'), '/zh/write');
  assert.equal(safeRedirect('/zh/login'), '/'); // 回环拦截（带前缀写法）
  assert.equal(safeRedirect('/login'), '/');
  assert.equal(safeRedirect('//evil.com'), '/'); // 开放重定向拦截
  assert.equal(safeRedirect('https://evil.com'), '/');
  console.log('✓ 用例6 redirect 安全校验：开放重定向拦截 + /zh 前缀路径判定与保留正确');
}

console.log('\n全部自检通过 ✓');
