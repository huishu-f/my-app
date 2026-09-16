/**
 * @file 当前用户 Hook
 * @description 统一获取当前登录用户的取值顺序：优先客户端实时登录态（useAuth 上下文），
 *              SSR 传入的 user 作为兜底。详情页公开内容静态化后 SSR user 可能为 null，
 *              由 useAuth 在客户端补齐实时登录态。
 */
'use client';

import { useAuth } from '@/components/auth-provider';
import type { User } from '@my-app/shared';

/**
 * 当前登录用户 Hook
 * @param ssrUser SSR 传入的用户（详情页静态化后可能为 null），可为完整 User 或其部分子集
 * @returns 客户端登录态优先、SSR prop 兜底的当前用户；均无则返回 null（游客态）
 * @example
 * const user = useCurrentUser(ssrUser);
 */
export function useCurrentUser<T extends { id: string } = User>(ssrUser?: T | null): User | T | null {
  const { user: me } = useAuth();
  return me ?? ssrUser ?? null;
}
