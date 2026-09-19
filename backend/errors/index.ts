/**
 * @file index.ts
 * @description 错误模块统一导出桶文件：从 app-error.ts 再导出全部错误类
 */
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
} from './app-error';
