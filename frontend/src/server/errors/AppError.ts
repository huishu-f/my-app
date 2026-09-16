/**
 * @file 应用错误类体系
 * @description 定义统一的 HTTP 错误基类 AppError 及各业务场景错误子类，
 *              路由/服务层抛出后由 sendError 统一转为标准错误响应
 */

/**
 * 应用错误基类
 * @description 携带 HTTP 状态码、机器可读错误代码与可选详情列表，
 *              所有业务错误均继承此类；name 自动取子类名，便于日志排查
 */
export class AppError extends Error {
  /**
   * 初始化应用错误
   * @param statusCode HTTP 状态码
   * @param code 机器可读的错误代码字符串（如 'BadRequest'）
   * @param message 人类可读的错误信息
   * @param details 额外错误详情列表（如字段校验错误），可选
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

/**
 * 请求参数错误
 * @description HTTP 400，请求参数不合法
 */
export class BadRequestError extends AppError {
  /**
   * @param message 错误信息，默认 '请求参数错误'
   * @param details 额外错误详情
   */
  constructor(message = '请求参数错误', details?: Array<Record<string, unknown>>) {
    super(400, 'BadRequest', message, details);
  }
}

/**
 * 未授权错误
 * @description HTTP 401，用户未登录或 token 无效/过期
 */
export class UnauthorizedError extends AppError {
  /**
   * @param message 错误信息，默认 '未授权，请先登录'
   */
  constructor(message = '未授权，请先登录') {
    super(401, 'Unauthorized', message);
  }
}

/**
 * 权限不足错误
 * @description HTTP 403，用户已登录但无当前操作的权限
 */
export class ForbiddenError extends AppError {
  /**
   * @param message 错误信息，默认 '权限不足'
   */
  constructor(message = '权限不足') {
    super(403, 'Forbidden', message);
  }
}

/**
 * 资源不存在错误
 * @description HTTP 404，请求的资源（文章/用户等）未找到
 */
export class NotFoundError extends AppError {
  /**
   * @param message 错误信息，默认 '资源不存在'
   */
  constructor(message = '资源不存在') {
    super(404, 'NotFound', message);
  }
}

/**
 * 资源冲突错误
 * @description HTTP 409，请求与现有资源状态冲突（如重名、重复创建）
 */
export class ConflictError extends AppError {
  /**
   * @param message 错误信息，默认 '资源冲突'
   */
  constructor(message = '资源冲突') {
    super(409, 'Conflict', message);
  }
}

/**
 * 服务器内部错误
 * @description HTTP 500，非预期异常或基础设施故障
 */
export class InternalServerError extends AppError {
  /**
   * @param message 错误信息，默认 '服务器内部错误'
   */
  constructor(message = '服务器内部错误') {
    super(500, 'InternalServerError', message);
  }
}

/**
 * 请求参数验证失败错误
 * @description HTTP 400，zod 校验未通过，details 携带字段级校验错误列表
 */
export class ValidationError extends AppError {
  /**
   * @param message 错误信息，默认 '请求参数验证失败'
   * @param details 字段校验错误详情列表（path + message）
   */
  constructor(message = '请求参数验证失败', details?: Array<Record<string, unknown>>) {
    super(400, 'ValidationError', message, details);
  }
}

/**
 * 请求内容不符合规则错误
 * @description HTTP 422，参数格式合法但语义不满足业务规则
 */
export class UnprocessableEntityError extends AppError {
  /**
   * @param message 错误信息，默认 '请求内容不符合规则'
   * @param details 额外错误详情
   */
  constructor(message = '请求内容不符合规则', details?: Array<Record<string, unknown>>) {
    super(422, 'UnprocessableEntity', message, details);
  }
}

/**
 * 请求过于频繁错误
 * @description HTTP 429，触发滑动窗口限流阈值
 */
export class RateLimitError extends AppError {
  /**
   * @param message 错误信息，默认 '请求过于频繁，请稍后再试'
   */
  constructor(message = '请求过于频繁，请稍后再试') {
    super(429, 'RateLimitError', message);
  }
}
