/**
 * @file useLogoutRedirect.ts
 * @description 登出流程 Hook：桌面下拉与移动端抽屉共用的「收起浮层 → 回首页 → 登出 → toast 反馈」链路
 */
'use client';

import { useTranslations } from 'next-intl';
import toast from '@/lib/toast';
import { useRouter } from '@/i18n/navigation';
import { useLogout } from '@/services/auth/hooks';

/**
 * 生成登出动作
 * @param onBeforeLeave 跳转前的收尾回调（收起下拉菜单 / 抽屉等）
 * @returns 可直接挂到 onClick 的动作函数
 * @description 先本地收起浮层并乐观跳转首页（不等待请求），再发起登出 mutation，
 *   成功/失败仅在结果返回后以 toast 反馈，避免用户被登录态滞后阻塞
 */
export function useLogoutRedirect(onBeforeLeave: () => void) {
  const router = useRouter();
  const t = useTranslations('nav');
  const logoutMutation = useLogout();

  return () => {
    onBeforeLeave();
    router.replace('/');
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('logoutSuccess'));
      },
      onError: () => {
        toast.error(t('logoutFailed'));
      },
    });
  };
}
