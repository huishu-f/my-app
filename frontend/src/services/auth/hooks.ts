/**
 * @file 认证模块 Hooks
 * @description 基于 authApi 封装的登录/注册/登出提交操作，
 *              由 useAsyncAction 管理提交状态并内置成功副作用。
 *              当前登录态的读取请使用 useAuth()（全局 Context，见 @/components/auth-provider）。
 */
import { useCallback } from 'react';
import { useAsyncAction } from '@/lib/use-async-action';
import { useAuth } from '@/components/auth-provider';
import { clearAuthStatus } from '@/lib/auth-status';
import type { AuthUserResponse, LoginDto, RegisterDto } from '@my-app/shared';
import { authApi } from './api';

/**
 * 登录 Hook
 * @returns useAsyncAction 的提交器与 isPending 状态
 * @description 登录成功后拉取 /auth/me 刷新全局登录态（Cookie 已由后端下发）；
 *              me 拉取失败不阻塞登录流程，后续路由切换会自然重试
 * @example
 * const { mutate: login, isPending } = useLogin();
 * login(dto, { onSuccess: () => router.push('/') });
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
 * 注册 Hook
 * @returns useAsyncAction 的提交器与 isPending 状态
 * @description 仅创建用户不下发登录态，注册成功后由调用方引导用户登录
 */
export function useRegister() {
  const action = useCallback((dto: RegisterDto) => authApi.register(dto), []);
  return useAsyncAction<RegisterDto, AuthUserResponse>(action);
}

/**
 * 登出 Hook
 * @returns useAsyncAction 的提交器与 isPending 状态
 * @description 登出成功后清除 auth_status Cookie（并广播跨标签页登出信号），
 *              同时将全局登录态置空，UI 回到游客态
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
