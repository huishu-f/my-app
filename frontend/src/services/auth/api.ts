/**
 * @file 认证模块 API 层
 * @description 前缀 /auth 的认证接口封装，采用 HttpOnly Cookie 鉴权，
 *              提供登录、注册、登出、修改密码、更新资料等调用。
 */
import { api } from '@/lib/api/request';
import type {
  AuthUserResponse,
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
} from '@my-app/shared';

/**
 * 认证模块 API 集合
 * @description 所有方法返回后端响应的 data 部分，错误统一抛 ApiRequestError
 */
export const authApi = {
  /**
   * 获取当前登录用户
   * @returns 用户信息（未登录时后端返回 401）
   * @description 使用 skipAuthRedirect，避免未登录时触发全局登录重定向
   */
  me: () => api.get<AuthUserResponse>('/auth/me', undefined, { skipAuthRedirect: true }),

  /**
   * 登录
   * @param dto 登录表单数据
   * @returns 无 data（登录态由后端下发 httpOnly Cookie）
   * @description 接口不限流；skipAuthRedirect 避免凭据错误（401）触发登录重定向
   */
  login: (dto: LoginDto) => api.post<null>('/auth/login', dto, { skipAuthRedirect: true }),

  /**
   * 注册
   * @param dto 注册表单数据
   * @returns 新建用户信息
   * @description 仅创建用户不下发登录态，注册成功后需显式登录
   */
  register: (dto: RegisterDto) => api.post<AuthUserResponse>('/auth/register', dto),

  /**
   * 登出
   * @returns 无 data
   * @description 后端清除 Cookie 并使 Token 失效
   */
  logout: () => api.post<null>('/auth/logout'),

  /**
   * 修改密码
   * @param dto 修改密码表单数据
   * @returns 无 data
   * @description 修改成功后后端清除登录态，需要重新登录
   */
  changePassword: (dto: ChangePasswordDto) => api.post<null>('/auth/change-password', dto),

  /**
   * 更新个人资料
   * @param dto 更新资料表单数据
   * @returns 更新后的用户信息
   * @description 后端会同步冗余到该用户的评论/文章作者字段
   */
  updateProfile: (dto: UpdateProfileDto) => api.put<AuthUserResponse>('/auth/profile', dto),
};
