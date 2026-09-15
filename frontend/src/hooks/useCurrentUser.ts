/**
 * @file useCurrentUser.ts
 * @description 获取当前登录用户的通用 hook。
 *              优先使用客户端实时登录态（useAuth），SSR prop 作兜底——
 *              详情页公开内容静态化后 SSR user 可能为 null，useAuth 兜底获取实时状态。
 *              消除 PostActions / CommentsSection / AuthorActions 中的 `me ?? ssrUser` 重复。
 */
'use client';

import { useAuth } from '@/components/auth-provider';
import type { User } from '@my-app/shared';

/**
 * 获取当前登录用户：优先用客户端实时登录态，SSR prop 兜底
 * @param ssrUser SSR 传入的用户（详情页静态化后可能为 null），类型可以是完整 User 或部分子集
 * @returns 当前用户（优先返回完整 User，兜底返回 ssrUser），未登录返回 null
 */
export function useCurrentUser<T extends { id: string } = User>(ssrUser?: T | null): User | T | null {
  const { user: me } = useAuth();
  return me ?? ssrUser ?? null;
}
