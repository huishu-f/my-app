/**
 * @file API 通用响应结构
 * @description 定义全站统一的 API 响应包裹类型，所有后端接口返回值与前端请求封装均基于此结构
 */

/**
 * 统一 API 响应结构
 * @description 后端所有接口的响应外层格式，泛型 T 为业务数据类型
 * @template T 业务数据类型
 */
export interface ApiResponse<T> {
  /** 业务状态码，0 表示成功，非 0 表示各类业务错误 */
  code: number;
  /** 响应数据，类型由具体接口决定 */
  data: T;
  /** 提示信息，通常在出错时携带错误描述 */
  message?: string;
}
