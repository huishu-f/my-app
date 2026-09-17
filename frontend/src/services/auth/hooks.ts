/**
 * @file hooks.ts
 * @description 认证领域的客户端动作 Hook：登录/注册/登出，均基于 useAsyncAction 提供 pending 与防重入；仅在浏览器端组件中调用
 */
import { useCallback } from 'react';
import { useAsyncAction } from '@/lib/use-async-action';
import { useAuth } from '@/components/auth-provider';
import { clearAuthStatus } from '@/lib/auth-status';
import type { AuthUserResponse, LoginDto, RegisterDto } from '@my-app/shared';
import { authApi } from './api';

/**
 * 登录 Hook：调用登录接口后刷新全局用户态
 * @returns
 * - `mutate`    执行登录，入参 LoginDto；成功返回 null，失败返回 undefined 并触发 onError
 * - `isPending` 是否有进行中的登录
 * @example
 * const { mutate, isPending } = useLogin();
 * await mutate({ username, password });
 */
export function useLogin() {
  const { refreshMe } = useAuth();
  const action = useCallback(
    async (dto: LoginDto) => {
      await authApi.login(dto);
      try {
        await refreshMe();
      } catch {
        // 登录已成功，刷新用户态失败不应让整体动作判为失败，故静默吞掉 refreshMe 异常
      }
      return null;
    },
    [refreshMe],
  );
  return useAsyncAction<LoginDto, null>(action);
}

/**
 * 注册 Hook：调用注册接口，成功后返回新用户
 * @returns
 * - `mutate`    执行注册，入参 RegisterDto；成功返回 AuthUserResponse，失败返回 undefined
 * - `isPending` 是否有进行中的注册
 * @example
 * const { mutate, isPending } = useRegister();
 * const user = await mutate({ username, password });
 */
export function useRegister() {
  const action = useCallback((dto: RegisterDto) => authApi.register(dto), []);
  return useAsyncAction<RegisterDto, AuthUserResponse>(action);
}

/**
 * 登出 Hook：清除服务端登录态并重置本地用户与 Cookie
 * @returns
 * - `mutate`    执行登出，无入参；成功返回 null，失败返回 undefined
 * - `isPending` 是否有进行中的登出
 * @example
 * const { mutate } = useLogout();
 * await mutate();
 */
export function useLogout() {
  const { setMe } = useAuth();
  const action = useCallback(async () => {
    await authApi.logout();
    // 服务端已清 Cookie，这里同步清除本地 auth_status 并广播登出信号，再把全局用户置空
    clearAuthStatus();
    setMe(null);
    return null;
  }, [setMe]);
  return useAsyncAction<void, null>(action);
}
