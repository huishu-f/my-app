/**
 * @file AuthorActions.tsx
 * @description 详情页作者操作区：仅当当前登录用户为该文章作者时渲染编辑/删除入口，否则不渲染任何内容
 */
'use client';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { DeletePostButton } from './DeletePostButton';

/**
 * AuthorActions 作者操作区
 * @param props 组件入参，字段含义见内联类型
 * @param props.postId 当前文章 id，透传给删除按钮
 * @param props.authorId 文章作者 id，可能为空
 * @param props.ssrUser 服务端预取的当前用户，用于客户端首帧避免重复请求
 */
export function AuthorActions({
  postId,
  authorId,
  ssrUser,
}: {
  /** 当前文章 id */
  postId: string;
  /** 文章作者 id，缺省时不展示操作 */
  authorId?: string;
  /** 服务端注入的当前用户（仅取 id 判断身份），未登录为 null */
  ssrUser?: { id: string } | null;
}) {
  /** 合并 SSR 用户与客户端会话得到的当前用户 */
  const user = useCurrentUser(ssrUser);

  // 非作者本人（含未登录）不展示任何操作入口
  if (!user || !authorId || user.id !== authorId) return null;

  return <DeletePostButton postId={postId} variant="full" redirectTo="/posts" />;
}
