/**
 * @file 服务端错误类型统一出口
 * @description 汇总导出应用错误基类 AppError 及全部业务错误子类，
 *              服务端各模块统一从 '@server/errors' 导入，避免深路径引用
 */
export {
  /** 应用错误基类 */
  AppError,
  /** 请求参数错误（400） */
  BadRequestError,
  /** 未授权错误（401） */
  UnauthorizedError,
  /** 权限不足错误（403） */
  ForbiddenError,
  /** 资源不存在错误（404） */
  NotFoundError,
  /** 资源冲突错误（409） */
  ConflictError,
  /** 服务器内部错误（500） */
  InternalServerError,
  /** 请求参数验证失败（400） */
  ValidationError,
  /** 请求内容不符合规则（422） */
  UnprocessableEntityError,
  /** 请求过于频繁（429） */
  RateLimitError,
} from './AppError';
