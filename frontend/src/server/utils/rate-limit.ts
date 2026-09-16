/**
 * @file 内存滑动窗口限流工具
 * @description 基于进程内存的滑动窗口限频器：按维度 key（通常是 路由名:IP）限制窗口内请求数，
 *              并提供从请求头提取客户端 IP 的辅助函数，供登录/注册等接口防刷复用。
 *              引入 'server-only' 保证仅服务端使用。
 */

import 'server-only';

/**
 * 内存滑动窗口限频器实现说明
 * ponytail: 单实例进程内方案，多实例部署需替换为分布式方案（如 @upstash/ratelimit）。
 * ponytail: buckets Map 的 key 随 IP×路由组合增长，从不清理空 key，
 *           天花板：~10 万级 key 时 Map 内存开始显著（每个 key 约 100B），
 *           升级路径：定期 sweep 空 bucket，或改用 LRU 淘汰。
 * 过期时间戳在每次 check 时惰性清理，无需后台定时器
 */

/**
 * 限频桶
 * @description 记录一个限频维度在滑动窗口内的全部请求时间戳
 */
interface Bucket {
  /** 窗口内各次请求的毫秒时间戳 */
  timestamps: number[];
}

/** 全局限频桶集合，key 为限频维度标识（如 login:1.2.3.4） */
const buckets = new Map<string, Bucket>();

/**
 * 消费一次请求配额，并惰性清理窗口外时间戳
 * @param key 限频维度标识
 * @param limit 窗口内最大请求数
 * @param windowMs 窗口时长，单位 ms
 * @returns allowed=是否放行；remaining=剩余可用请求数（被拒时为 0）
 */
function consume(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const bucket = buckets.get(key);

  // 只保留窗口内的时间戳，窗口外的惰性清理掉
  const valid = bucket ? bucket.timestamps.filter((t) => t > cutoff) : [];

  // 已达上限：写回清理结果但不记录本次请求
  if (valid.length >= limit) {
    buckets.set(key, { timestamps: valid });
    return { allowed: false, remaining: 0 };
  }

  valid.push(now);
  buckets.set(key, { timestamps: valid });
  return { allowed: true, remaining: limit - valid.length };
}

/**
 * 检查并消费一次限频配额
 * @param key 限频维度标识（如 `login:${ip}` 或 `register:${ip}`）
 * @param limit 窗口内最大请求数
 * @param windowMs 窗口时长，单位 ms
 * @returns 是否被限流：true=超限应拒绝，false=放行
 * @example
 * if (isRateLimited(`login:${ip}`, 5, 60_000)) throw new RateLimitError();
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  return !consume(key, limit, windowMs).allowed;
}

/**
 * 从请求头提取客户端 IP
 * @param request 网络请求对象
 * @returns 客户端 IP：优先取 x-forwarded-for 首段（代理链最左侧），
 *          其次取 x-real-ip，均无法识别时返回 'unknown'
 * @example
 * getClientIp(request) // => '203.0.113.1'
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
