/**
 * @file 前端请求错误类
 * @description 前端请求层的统一错误类型，携带 HTTP 状态码、业务 code 与字段校验详情，并提供鉴权相关状态判断
 */

import type { ValidationErrorDetail } from '../ui';

/**
 * 请求错误
 * @description API 请求失败时抛出的统一错误类，除 message 外携带 HTTP 状态码、业务错误码与可选的校验详情
 * @example
 * try {
 *   await fetcher.post('/api/posts', dto);
 * } catch (e) {
 *   if (e instanceof ApiRequestError && e.isUnauthorized) {
 *     redirect('/login');
 *   }
 * }
 */
export class ApiRequestError extends Error {
  /**
   * 初始化请求错误实例
   * @param status HTTP 状态码（如 401、422、500）
   * @param code 业务错误码
   * @param message 错误消息
   * @param details 字段校验详情列表（422 类错误时携带）
   */
  constructor(
    /** HTTP 状态码 */
    public readonly status: number,
    /** 业务错误码，非 0 表示业务错误 */
    public readonly code: number,
    message: string,
    /** 字段校验详情列表 */
    public readonly details?: ValidationErrorDetail[],
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }

  /**
   * 是否未授权
   * @returns HTTP 状态码为 401 时为 true，指示需登录跳转
   */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /**
   * 是否无权限
   * @returns HTTP 状态码为 403 时为 true，指示已登录但无权操作
   */
  get isForbidden(): boolean {
    return this.status === 403;
  }
}
