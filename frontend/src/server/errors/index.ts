/**
 * @file index.ts
 * @description 服务端错误类型统一出口，汇总导出 AppError 及各业务错误类；供服务端各模块引用
 */
export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  ValidationError,
  UnprocessableEntityError,
  RateLimitError,
} from './AppError';
