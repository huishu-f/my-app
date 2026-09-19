/**
 * @file rate-limit-policy.ts
 * @description 写操作的限流策略单一真源。
 *
 * 为什么单独放一份：同一个业务动作可能有**多个入口** —— 对外 `POST /api/posts` 与同源 UI 的
 * `createPostAction` 就是如此。限流参数散落在各入口时必然漂移：曾出现两处各写一份「10 次 / 5 分钟」，
 * 任何一处调整频次或文案，另一处不会跟着变，等于其中一条入口的防护悄悄失效。
 *
 * 约定：新增入口时从本表取策略，不要在路由或 Action 里内联字面量。
 */

/** 限流策略（键名会与客户端 IP 拼成实际计数键） */
export interface RateLimitPolicy {
  /** 计数维度前缀，实际键为 `${key}:${ip}` */
  key: string;
  /** 窗口内允许的最大请求数 */
  limit: number;
  /** 窗口长度，单位 ms */
  windowMs: number;
  /** 触发限流时的提示文案 */
  message: string;
}

/**
 * 发表文章：对外 API 与 Server Action 共用。
 * 两条入口用同一个 key，因此共享同一份计数 —— 从 UI 发一篇和从 API 发一篇消耗同一个配额。
 */
export const POST_CREATE_RATE_LIMIT: RateLimitPolicy = {
  key: 'posts:create',
  limit: 10,
  windowMs: 5 * 60_000,
  message: '发布过于频繁，请稍后再试',
};

/**
 * 通用限流文案，与 `route-handler.ts` 里 `RouteOptions.rateLimit.message` 的缺省值保持逐字一致：
 * 迁移到 Server Action 的入口不能因为「换了个入口」而让用户看到另一套提示语。
 */
const DEFAULT_RATE_LIMIT_MESSAGE = '请求过于频繁，请稍后再试';

/**
 * 点赞 / 取消点赞：对外 `POST /api/posts/[id]/like` 与同源 UI 的 `likePostAction` 共用。
 */
export const POST_LIKE_RATE_LIMIT: RateLimitPolicy = {
  key: 'posts:like',
  limit: 30,
  windowMs: 60_000,
  message: DEFAULT_RATE_LIMIT_MESSAGE,
};

/**
 * 收藏 / 取消收藏：对外 `POST /api/posts/[id]/favorite` 与同源 UI 的 `favoritePostAction` 共用。
 */
export const POST_FAVORITE_RATE_LIMIT: RateLimitPolicy = {
  key: 'posts:favorite',
  limit: 30,
  windowMs: 60_000,
  message: DEFAULT_RATE_LIMIT_MESSAGE,
};

/**
 * 发表评论：对外 `POST /api/posts/[id]/comments` 与同源 UI 的 `createCommentAction` 共用。
 */
export const COMMENT_CREATE_RATE_LIMIT: RateLimitPolicy = {
  key: 'comments:create',
  limit: 10,
  windowMs: 5 * 60_000,
  message: '评论过于频繁，请稍后再试',
};
