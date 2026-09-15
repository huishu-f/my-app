/**
 * @file hooks.ts
 * @description 认证模块 Hooks。基于 authApi 封装，提供登录/注册/登出/修改密码/更新资料
 *              等提交操作（useAsyncAction 管理提交态，内置成功副作用）。
 *              当前登录态读取请使用 useAuth()（全局 Context，见 @/components/auth-provider）。
 */
import { useCallback } from 'react';
import { useAsyncAction } from '@/lib/use-async-action';
import { useAuth } from '@/components/auth-provider';
import { clearAuthStatus } from '@/lib/auth-status';
import type {
  AuthUserResponse,
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  UpdateProfileDto,
} from '@my-app/shared';
import { authApi } from './api';

/**
 * 登录 Hook，成功后拉取用户刷新全局登录态（cookie 已由后端下发）；me 拉取失败不阻塞登录流程，后续路由切换会重试
 * @param dto 登录表单数据
 * @returns useAsyncAction 提交函数与提交状态
 */
export function useLogin() {
  const { refreshMe } = useAuth();
  const action = useCallback(
    async (dto: LoginDto) => {
      await authApi.login(dto);
      try {
        await refreshMe();
      } catch {
        // me 请求失败不阻塞登录流程
      }
      return null;
    },
    [refreshMe],
  );
  return useAsyncAction<LoginDto, null>(action);
}

/**
 * 注册 Hook，仅创建用户，不下发登录态，需显式登录
 * @param dto 注册表单数据
 * @returns useAsyncAction 提交函数与提交状态
 */
export function useRegister() {
  const action = useCallback((dto: RegisterDto) => authApi.register(dto), []);
  return useAsyncAction<RegisterDto, AuthUserResponse>(action);
}

/**
 * 登出 Hook，成功后清除全局登录态，UI 回到游客态
 * @returns useAsyncAction 提交函数与提交状态
 */
export function useLogout() {
  const { setMe } = useAuth();
  const action = useCallback(async () => {
    await authApi.logout();
    clearAuthStatus();
    setMe(null);
    return null;
  }, [setMe]);
  return useAsyncAction<void, null>(action);
}

/**
 * 修改密码 Hook，成功后登录态被后端清除，同步置游客态（需重新登录）
 * @param dto 修改密码表单数据
 * @returns useAsyncAction 提交函数与提交状态
 */
export function useChangePassword() {
  const { setMe } = useAuth();
  const action = useCallback(
    async (dto: ChangePasswordDto) => {
      await authApi.changePassword(dto);
      clearAuthStatus();
      setMe(null);
      return null;
    },
    [setMe],
  );
  return useAsyncAction<ChangePasswordDto, null>(action);
}

/**
 * 更新个人资料 Hook，成功后重新拉取用户，全局同步最新资料（UserMenu 头像/昵称即时更新）
 * @param dto 更新资料表单数据
 * @returns useAsyncAction 提交函数与提交状态
 */
export function useUpdateProfile() {
  const { refreshMe } = useAuth();
  const action = useCallback(
    async (dto: UpdateProfileDto) => {
      await authApi.updateProfile(dto);
      try {
        await refreshMe();
      } catch {
        // 刷新失败不阻塞保存流程
      }
      return null;
    },
    [refreshMe],
  );
  return useAsyncAction<UpdateProfileDto, null>(action);
}
