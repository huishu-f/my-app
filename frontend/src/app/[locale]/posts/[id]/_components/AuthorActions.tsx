/**
 * @file AuthorActions.tsx
 * @description 作者专属操作（删除文章）客户端岛屿。
 *              详情页公开内容静态化后，服务端渲染不再判权（快路径无登录态），
 *              作者身份由客户端 useAuth 实时判定，SSR user prop 仅作初始兑底。
 */
'use client';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { DeletePostButton } from './DeletePostButton';

/**
 * AuthorActions 作者操作栏
 * @param props.postId 文章 ID
 * @param props.authorId 文章作者 ID
 * @param props.ssrUser SSR 传入的用户（慢路径草稿预览时有值），作客户端登录态的初始兑底
 */
export function AuthorActions({
  postId,
  authorId,
  ssrUser,
}: {
  postId: string;
  authorId?: string;
  ssrUser?: { id: string } | null;
}) {
  /** 客户端实时登录态，SSR prop 作兜底 */
  const user = useCurrentUser(ssrUser);

  /** 非作者不渲染任何内容（含未登录、登录但非本人） */
  if (!user || !authorId || user.id !== authorId) return null;

  return <DeletePostButton postId={postId} variant="full" redirectTo="/posts" />;
}
