/**
 * @file hooks.ts
 * @description 认证领域的客户端动作 Hook：登出，基于 useAsyncAction 提供 pending 与防重入；仅在浏览器端组件中调用
 *
 * 登录/注册不在此处：两个表单已改用 useActionState 直接调 useAuth 与 authApi（见 features/auth/components），
 * 原先的 useLogin/useRegister 因此成了零调用死代码，已删除，不再保留第二套入口。
 */
import { useCallback } from 'react';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useAuth } from '@/providers/AuthProvider';
import { clearAuthStatus } from '@/lib/auth-status';
import { authApi } from '@/services/auth/read';

/**
 * 登出 Hook：清除服务端登录态并重置本地用户与 Cookie
 * @returns
 * - `mutate`    执行登出，无入参；成功返回 null，失败返回 undefined
 * - `isPending` 是否有进行中的登出
 * @example
 * const { mutate } = useLogout();
 * await mutate();
 * @description 本地清态放在 finally：即使 logout 请求因网络异常/服务端 5xx 失败，
 *   也先把本地用户与 auth_status 清掉——「退出失败但界面退不掉」的死局比
 *   「退出了但服务端 token 没作废」（token 7 天后自然过期）对用户伤害更大。
 */
export function useLogout() {
  const { setMe } = useAuth();
  const action = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // 服务端已清 Cookie（或请求失败时本地兜底）：清除 auth_status 并广播登出信号，再把全局用户置空
      clearAuthStatus();
      setMe(null);
    }
    return null;
  }, [setMe]);
  return useAsyncAction<void, null>(action);
}
