/**
 * @file useCurrentUser.ts
 * @description 读取当前登录用户：客户端优先取 AuthProvider 的实时用户，未登录时回退到 SSR 注入的兜底数据
 */
'use client';

import { useAuth } from '@/providers/AuthProvider';
import type { User } from '@my-app/shared';

/**
 * 获取当前用户，合并客户端登录态与服务端预取数据
 * @param ssrUser 服务端渲染注入的用户兜底数据，无则为 null/undefined
 * @returns 已登录返回 AuthProvider 中的用户；未登录但有 ssrUser 时返回 ssrUser；两者皆无返回 null
 * @example
 * const user = useCurrentUser(ssrUser);
 * @template T 带 id 的用户类型，默认 shared 的 User
 */
export function useCurrentUser<T extends { id: string } = User>(
  ssrUser?: T | null,
): User | T | null {
  const { user: me } = useAuth();
  return me ?? ssrUser ?? null;
}
