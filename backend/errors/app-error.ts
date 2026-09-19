/**
 * @file app-error.ts
 * @description 统一应用错误基类及常见 HTTP 语义子类，携带状态码与业务 code 供路由层转换为响应
 */
/**
 * 应用错误基类：封装 HTTP 状态码、业务错误码与可选校验明细。
 * 路由层通过 sendError 读取 statusCode/code/details 统一转成 JSON 响应。
 */
/**
 * 跨 chunk 稳定的错误品牌标记。
 *
 * Turbopack 会把本模块分别打进每一个路由 chunk（实测同一个 class 同时存在于 14 个 server chunk 中），
 * 于是「service 层 new 出来的实例」与「路由层 import 到的构造函数」不是同一个引用，跨 chunk 的
 * `instanceof AppError` 恒为 false——表现为所有服务层抛出的 AppError（404/409/403/422）被静默降级成 500。
 *
 * `Symbol.for` 走全局符号注册表，重复定义仍返回同一个符号，因此可作为跨 chunk 的品牌判定依据，
 * 同时保留 instanceof 的严格性（鸭子类型不成立，属性名不可被偶然撞上）。
 */
const APP_ERROR_BRAND = Symbol.for('my-app/AppError');

export class AppError extends Error {
  /**
   * 构造应用错误
   * @param statusCode HTTP 状态码，如 400/401/500
   * @param code 业务错误码标识，如 'BadRequest'
   * @param message 面向用户的错误描述
   * @param details 可选的字段级校验明细列表
   */
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Array<Record<string, unknown>>,
  ) {
    super(message);
    this.name = this.constructor.name;
    // 写入品牌：不可枚举，不会进入 JSON 序列化与日志展开
    Object.defineProperty(this, APP_ERROR_BRAND, { value: true });
  }
}

/**
 * 判定任意异常是否为 AppError，跨 chunk 安全（instanceof 在 Turbopack 分包下会失效）
 * @param err 待判定值
 * @returns 是 AppError（含其子类，无论来自哪个 chunk）时为 true
 */
export function isAppError(err: unknown): err is AppError {
  if (err instanceof AppError) return true;
  if (typeof err !== 'object' || err === null) return false;
  return (err as unknown as Record<symbol, unknown>)[APP_ERROR_BRAND] === true;
}

/**
 * 判定异常是否为指定 HTTP 状态码的 AppError，用于跨 chunk 场景下替代子类 instanceof 判定
 * @param err 待判定异常
 * @param statusCode 期望的 HTTP 状态码，如 404
 * @returns 是 AppError 且状态码匹配时为 true
 */
export function isAppErrorWithStatus(err: unknown, statusCode: number): err is AppError {
  return isAppError(err) && err.statusCode === statusCode;
}

/** 未授权/未登录（HTTP 401，code 'Unauthorized'） */
export class UnauthorizedError extends AppError {
  /**
   * @param message 错误描述，默认 '未授权，请先登录'
   */
  constructor(message = '未授权，请先登录') {
    super(401, 'Unauthorized', message);
  }
}

/** 权限不足（HTTP 403，code 'Forbidden'） */
export class ForbiddenError extends AppError {
  /**
   * @param message 错误描述，默认 '权限不足'
   */
  constructor(message = '权限不足') {
    super(403, 'Forbidden', message);
  }
}

/** 资源不存在（HTTP 404，code 'NotFound'） */
export class NotFoundError extends AppError {
  /**
   * @param message 错误描述，默认 '资源不存在'
   */
  constructor(message = '资源不存在') {
    super(404, 'NotFound', message);
  }
}

/** 资源冲突（HTTP 409，code 'Conflict'） */
export class ConflictError extends AppError {
  /**
   * @param message 错误描述，默认 '资源冲突'
   */
  constructor(message = '资源冲突') {
    super(409, 'Conflict', message);
  }
}

/** 服务器内部错误（HTTP 500，code 'InternalServerError'） */
export class InternalServerError extends AppError {
  /**
   * @param message 错误描述，默认 '服务器内部错误'
   */
  constructor(message = '服务器内部错误') {
    super(500, 'InternalServerError', message);
  }
}

/** 参数校验失败（HTTP 400，code 'ValidationError'，可携带字段级 details） */
export class ValidationError extends AppError {
  /**
   * @param message 错误描述，默认 '请求参数验证失败'
   * @param details 字段级校验明细，通常来自 formatZodIssues
   */
  constructor(message = '请求参数验证失败', details?: Array<Record<string, unknown>>) {
    super(400, 'ValidationError', message, details);
  }
}

/** 请求内容不符合业务规则（HTTP 422，code 'UnprocessableEntity'，可携带 details） */
export class UnprocessableEntityError extends AppError {
  /**
   * @param message 错误描述，默认 '请求内容不符合规则'
   * @param details 可选的业务校验明细
   */
  constructor(message = '请求内容不符合规则', details?: Array<Record<string, unknown>>) {
    super(422, 'UnprocessableEntity', message, details);
  }
}

/** 请求频率超限（HTTP 429，code 'RateLimitError'） */
export class RateLimitError extends AppError {
  /**
   * @param message 错误描述，默认 '请求过于频繁，请稍后再试'
   */
  constructor(message = '请求过于频繁，请稍后再试') {
    super(429, 'RateLimitError', message);
  }
}
