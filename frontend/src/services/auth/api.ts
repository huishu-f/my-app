/**
 * @file api.ts
 * @description 认证领域接口集合：登录/注册/登出/改密/取当前用户/更新资料；统一走 api 请求层，业务失败或网络异常抛 ApiRequestError
 */
import { api } from '@/lib/api/request';
import type {
  AuthUserResponse,
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
} from '@my-app/shared';

/** 认证相关接口集合；除 me/login/logout 外的写操作均依赖已登录鉴权 Cookie */
export const authApi = {
  /**
   * 获取当前登录用户信息（用于探测登录态）
   * @returns 当前用户 AuthUserResponse
   * @throws 未登录或网络异常时抛 ApiRequestError；skipAuthRedirect 使 401 不触发登录页跳转，交由调用方处理未登录态
   */
  me: () => api.get<AuthUserResponse>('/auth/me', undefined, { skipAuthRedirect: true }),

  /**
   * 账号密码登录，成功后登录态写入 HttpOnly Cookie
   * @param dto 用户名与密码
   * @returns 成功无返回体（null）
   * @throws 凭证错误或网络异常时抛 ApiRequestError；skipAuthRedirect 避免登录失败再跳登录页形成循环
   */
  login: (dto: LoginDto) => api.post<null>('/auth/login', dto, { skipAuthRedirect: true }),

  /**
   * 注册新用户；成功后**不**自动建立登录态，需自行跳转登录页
   * @param dto 注册信息（用户名、密码等）
   * @returns 注册成功后的用户 AuthUserResponse
   * @throws 用户名/邮箱重复或校验失败时抛 ApiRequestError
   */
  register: (dto: RegisterDto) => api.post<AuthUserResponse>('/auth/register', dto),

  /**
   * 退出登录，服务端清除鉴权 Cookie
   * @returns 成功无返回体（null）
   * @throws 网络异常时抛 ApiRequestError
   */
  logout: () => api.post<null>('/auth/logout'),

  /**
   * 修改当前用户密码
   * @param dto 原密码与新密码
   * @returns 成功无返回体（null）
   * @throws 原密码错误或新密码校验失败时抛 ApiRequestError
   */
  changePassword: (dto: ChangePasswordDto) => api.post<null>('/auth/change-password', dto),

  /**
   * 更新当前用户资料
   * @param dto 可修改的资料字段（昵称、头像等）
   * @returns 更新后的 AuthUserResponse
   * @throws 字段校验失败或网络异常时抛 ApiRequestError
   */
  updateProfile: (dto: UpdateProfileDto) => api.put<AuthUserResponse>('/auth/profile', dto),
};
