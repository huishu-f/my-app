/**
 * @file CommentsSection.tsx
 * @description 文章评论区，支持发表、编辑、删除评论，未登录时引导登录。
 *              利用 React 19 useOptimistic 实现评论发表的乐观更新——
 *              评论提交瞬间即显示在列表中，API 完成后刷新确认，失败自动移除。
 */
'use client';

import { useOptimistic, useTransition, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, MessageCircle } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from '@/services/comment/hooks';
import { usePostPageAuth } from '@/hooks/usePostPageAuth';
import { getInitials, splitName, formatRelativeTime } from '@/lib/format';
import type { CommentsSectionProps, Comment } from '@my-app/shared';

/** 模块级空数组常量，避免 useOptimistic 因新引用而重置 */
const EMPTY_COMMENTS: Comment[] = [];

/**
 * CommentsSection 评论区
 * @param props {@link CommentsSectionProps}
 */
export function CommentsSection({ postId, user: ssrUser, postAuthorId }: CommentsSectionProps) {
  const { data: commentsData, isError, refetch: refetchComments } = useComments(postId);
  /** 评论列表（实际状态） */
  const comments = commentsData?.comments ?? EMPTY_COMMENTS;
  /** 创建评论 mutation */
  const createCommentMutation = useCreateComment(postId);
  /** 更新评论 mutation */
  const updateCommentMutation = useUpdateComment();
  /** 删除评论 mutation */
  const deleteCommentMutation = useDeleteComment();

  /** 文章详情页鉴权 + 状态三合一 hook */
  const { user, updatePost, requireAuth } = usePostPageAuth(postId, ssrUser);

  /**
   * 乐观评论列表 — React 19 useOptimistic，提交评论时 addOptimisticComment 立即将临时评论插入列表顶部，
   * API 完成后 refetchComments 刷新实际状态，transition 结束自动对齐
   */
  const [optimisticComments, addOptimisticComment] = useOptimistic<Comment[], Comment>(
    comments,
    (current, newComment) => [newComment, ...current],
  );

  /** 过渡状态与启动器，乐观更新期间 isPending 为 true（控制按钮禁用/加载） */
  const [isPending, startTransition] = useTransition();

  /** 新评论输入文本 */
  const [commentText, setCommentText] = useState('');
  /** 当前正在编辑的评论 ID */
  const [editingId, setEditingId] = useState<string | null>(null);
  /** 编辑评论的文本内容 */
  const [editText, setEditText] = useState('');
  /** 评论展示数量（分页每次加载5条） */
  const [visibleCount, setVisibleCount] = useState(5);
  /** 待删除的评论 ID（用于确认弹窗） */
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  /**
   * 提交新评论 — 乐观更新，点击瞬间即显示临时评论，API 完成后刷新确认
   */
  const submitComment = () => {
    const text = commentText.trim();
    if (!text) return;
    requireAuth(() => {
      startTransition(async () => {
        // 构造临时评论，立即显示在列表中
        const tempComment: Comment = {
          id: `optimistic-${Date.now()}`,
          postId,
          userId: user?.id ?? '',
          userName: user ? `${user.firstName} ${user.lastName}` : '',
          userAvatar: user?.avatar || undefined,
          content: text,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addOptimisticComment(tempComment);
        setCommentText('');
        const data = await createCommentMutation.mutate({ content: text });
        if (data) {
          refetchComments();
          updatePost((prev) => ({ ...prev, commentsCount: prev.commentsCount + 1 }));
        }
      });
    });
  };

  /**
   * 进入评论编辑模式
   */
  const startEdit = (cId: string, content: string) => {
    setEditingId(cId);
    setEditText(content);
  };

  /**
   * 保存编辑后的评论
   */
  const saveEdit = () => {
    const text = editText.trim();
    if (!text || !editingId) return;
    updateCommentMutation.mutate(
      { commentId: editingId, dto: { content: text } },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditText('');
          refetchComments();
        },
      },
    );
  };

  return (
    <section className="mt-10 mb-12">
      <h2 className="text-heading mb-6 text-(length:--type-2xl) leading-snug font-semibold">
        评论{' '}
        <span className="text-muted ml-1.5 text-(length:--type-sm) font-normal opacity-80">
          · {optimisticComments.length}
        </span>
      </h2>

      {/* 评论输入区 */}
      <div className="mb-8">
        {user ? (
          <>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  submitComment();
                }
              }}
              placeholder="写下你的想法...（1-2000 字符，⌘/Ctrl+Enter 发送）"
              maxLength={2000}
              rows={4}
              className="textarea-field"
            />
            <div className="mt-4 flex justify-end">
              <Button
                onClick={submitComment}
                disabled={!commentText.trim() || isPending}
                loading={isPending}
              >
                发表评论
              </Button>
            </div>
          </>
        ) : (
          <div className="card border-stroke text-muted rounded-xl border p-6 text-center text-(length:--type-base) leading-normal">
            <Link href={`/login?redirect=/posts/${postId}`} className="text-accent hover:underline">
              登录
            </Link>
            后参与评论
          </div>
        )}
      </div>

      {/* 评论列表 */}
      <div className="card-list">
        {isError ? (
          <EmptyState
            icon={<AlertCircle size={20} strokeWidth={2.5} />}
            title="评论加载失败"
            action={
              <Button variant="ghost" size="sm" onClick={() => refetchComments()}>
                重试
              </Button>
            }
          />
        ) : (
          optimisticComments.length === 0 && (
            <EmptyState
              icon={<MessageCircle size={20} strokeWidth={2.5} />}
              title="还没有评论"
              description="来说点什么吧"
            />
          )
        )}
        {optimisticComments.slice(0, visibleCount).map((c) => {
          const isCommentAuthor = !!user && c.userId === user.id;
          const canDelete =
            isCommentAuthor || (!!user && !!postAuthorId && postAuthorId === user.id);
          const { firstName, lastName } = splitName(c.userName);
          return (
            <div key={c.id} className="card card-hover row-md p-4">
              <Avatar
                initials={getInitials(firstName, lastName)}
                src={c.userAvatar || undefined}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <div className="row-md mb-1.5">
                  <span className="text-heading text-(length:--type-base) leading-normal font-semibold">
                    {c.userName}
                  </span>
                  <span className="meta-text">{formatRelativeTime(c.createdAt)}</span>
                </div>

                {editingId === c.id ? (
                  <div className="mt-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      className="textarea-field resize-y"
                    />
                    <div className="row-sm mt-4">
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        loading={updateCommentMutation.isPending}
                      >
                        保存
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setEditText('');
                        }}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-body text-(length:--type-base) leading-normal break-words">
                      {c.content}
                    </p>
                    {(isCommentAuthor || canDelete) && (
                      <div className="row-sm mt-3">
                        {isCommentAuthor && (
                          <button
                            onClick={() => startEdit(c.id, c.content)}
                            className="text-muted hover:text-heading text-(length:--type-xs) leading-normal transition-colors duration-200"
                          >
                            编辑
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTargetId(c.id)}
                            className="text-muted hover:text-heading text-(length:--type-xs) leading-normal transition-colors duration-200"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        {optimisticComments.length > visibleCount && (
          <div className="mt-6 text-center">
            <Button variant="ghost" size="sm" onClick={() => setVisibleCount((c) => c + 5)}>
              加载更多评论（剩余 {optimisticComments.length - visibleCount} 条）
            </Button>
          </div>
        )}
      </div>

      {/* 删除确认弹窗 */}
      <Modal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title="删除评论"
      >
        <p className="text-body text-(length:--type-base) leading-normal">
          确认删除这条评论吗？此操作不可撤销。
        </p>
        <div className="mt-8 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTargetId(null)}>
            取消
          </Button>
          <Button
            variant="danger"
            loading={deleteCommentMutation.isPending}
            onClick={() => {
              if (deleteTargetId) {
                deleteCommentMutation.mutate(deleteTargetId, {
                  onSuccess: () => {
                    refetchComments();
                    updatePost((prev) => ({
                      ...prev,
                      commentsCount: Math.max(0, prev.commentsCount - 1),
                    }));
                  },
                  onSettled: () => setDeleteTargetId(null),
                });
              }
            }}
          >
            确认删除
          </Button>
        </div>
      </Modal>
    </section>
  );
}
