/**
 * @file read.ts
 * @description 认证领域客户端接口集合：登录/注册/登出/取当前用户；统一走 api 请求层，业务失败或网络异常抛 ApiRequestError
 *
 * 改资料与改密码不在此处：它们由 Server Action 承担（见 `@/actions/auth`），
 * 因为这两处写发生在静态预渲染的 /settings 页里，需要在同一次往返内失效服务端缓存。
 */
import { api } from '@/lib/request';
import type { AuthUserResponse, LoginDto, RegisterDto } from '@my-app/shared';

/** 认证相关接口集合；除 me/register 外的写操作均依赖已登录鉴权 Cookie */
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
};
