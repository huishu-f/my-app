/**
 * @file 前端表单字段类型
 * @description 注册/登录等表单的字段标识与受控状态类型，用于统一的字段校验与状态管理
 */

/**
 * 表单字段标识
 * @description 'firstName' 名 / 'lastName' 姓 / 'username' 用户名 / 'email' 邮箱 / 'password' 密码
 */
export type FieldId = 'firstName' | 'lastName' | 'username' | 'email' | 'password';

/**
 * 单个表单字段的状态
 * @description 受控表单中每个字段的值、交互与校验状态 */
export interface FieldState {
  /** 当前输入值 */
  value: string;
  /** 是否已被交互过（失焦或修改） */
  touched: boolean;
  /** 校验结果：true 通过 / false 不通过 / null 尚未校验 */
  valid: boolean | null;
}
