/**
 * @file index.ts
 * @description 后端内核的公开出口（barrel）。宿主（Next / Express / Koa）只应从这里引用业务能力。
 *
 * 入口收敛在此的意义：宿主适配层与业务内核的边界显式可见。若把 Express 换进来，
 * 需要动的只有「runtime 注入 + 错误到响应的映射」，业务模块一律不用改。
 */

/** 依赖容器：仓储 / 服务 / Cookie 辅助的唯一装配入口与读取入口 */
export { getContainer, toSafeUser, type Container } from './container';

/** 运行时能力注册表：宿主启动时注入「响应后执行」等框架能力 */
export { configureRuntime, getRuntime, type RuntimeAdapter } from './runtime';

/** 领域错误类型：业务层只抛这些，由宿主的错误映射层翻译成 HTTP 响应 */
export {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  ValidationError,
  UnprocessableEntityError,
  RateLimitError,
  isAppError,
  isAppErrorWithStatus,
} from './errors';

/** 登录态解析：传入任意可读 Cookie 的请求对象即可，与框架无关 */
export { requireAuth, tryAuth, type AuthDeps, type CookieReadable } from './modules/auth/auth-guard';

/** 登录态写回：传入任意可写 Cookie 的响应对象即可，与框架无关 */
export { createAuthCookieHelper, type AuthCookieHelper, type CookieWritable } from './modules/auth/auth-cookie-helper';

/** 请求体校验器：路由层在调用服务前用它把不可信输入转成 DTO */
export {
  parseRegisterBody,
  parseLoginBody,
  parseChangePasswordBody,
  parseUpdateProfileBody,
} from './modules/auth/auth-validators';
export {
  parseCreatePostBody,
  parseUpdatePostBody,
  parseUpdateSiteConfigBody,
  parseListQuery,
} from './modules/blog/blog-validators';
export { parseCreateCommentBody } from './modules/comment/comment-validators';

/** 限流：基于 KV 的滑动窗口，按调用方提供的维度键计数 */
export { isRateLimited, getClientIp } from './utils/rate-limit';
