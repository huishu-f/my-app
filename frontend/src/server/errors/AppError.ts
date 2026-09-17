/**
 * @file AppError.ts
 * @description 统一应用错误基类及常见 HTTP 语义子类，携带状态码与业务 code 供路由层转换为响应
 */
/**
 * 应用错误基类：封装 HTTP 状态码、业务错误码与可选校验明细。
 * 路由层通过 sendError 读取 statusCode/code/details 统一转成 JSON 响应。
 */
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
  }
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
