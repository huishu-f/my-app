/**
 * @file CommentsSection.tsx
 * @description 文章评论区：发表（乐观更新）、编辑、删除（确认弹窗）与分页加载更多，
 *              未登录时展示登录引导；评论计数与操作栏通过 PostStateProvider 同步。
 */
'use client';

import { useOptimistic, useTransition, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { AlertCircle, MessageCircle, Send, Check, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
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
import type { Locale } from '@/i18n/config';
import type { CommentsSectionProps, Comment } from '@my-app/shared';

/** 模块级空数组常量，作为评论列表兜底值，避免 useOptimistic 因新引用而重置 */
const EMPTY_COMMENTS: Comment[] = [];

/**
 * CommentsSection 评论区组件
 * @param props.postId 文章 ID
 * @param props.user SSR 传入的用户，作客户端登录态初始兜底
 * @param props.postAuthorId 文章作者 ID（作者可删除任意评论）
 */
export function CommentsSection({ postId, user: ssrUser, postAuthorId }: CommentsSectionProps) {
  /** 文章文案翻译函数 */
  const t = useTranslations('post');
  /** 通用文案翻译函数 */
  const tCommon = useTranslations('common');
  /** 当前 locale，用于相对时间格式化 */
  const locale = useLocale() as Locale;
  /** 评论列表查询（isError 错误态 / refetchComments 手动刷新） */
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
   * @param cId 评论 ID
   * @param content 评论当前内容（填入编辑框）
   */
  const startEdit = (cId: string, content: string) => {
    setEditingId(cId);
    setEditText(content);
  };

  /**
   * 保存编辑后的评论：调用更新接口，成功后退出编辑模式并刷新列表
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
        {t('commentsTitle')}{' '}
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
              placeholder={t('commentPlaceholder')}
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
                <Send size={16} strokeWidth={2.5} />
                {t('submitComment')}
              </Button>
            </div>
          </>
        ) : (
          <div className="card border-stroke text-muted rounded-xl border p-6 text-center text-(length:--type-base) leading-normal">
            <Link href={`/login?redirect=/posts/${postId}`} className="text-accent hover:underline">
              {t('commentLoginBefore')}
            </Link>
            {t('commentLoginAfter')}
          </div>
        )}
      </div>

      {/* 评论列表 */}
      <div className="card-list">
        {isError ? (
          <EmptyState
            icon={<AlertCircle size={20} strokeWidth={2.5} />}
            title={t('commentLoadError')}
            action={
              <Button variant="ghost" onClick={() => refetchComments()}>
                {tCommon('retry')}
              </Button>
            }
          />
        ) : (
          optimisticComments.length === 0 && (
            <EmptyState
              icon={<MessageCircle size={20} strokeWidth={2.5} />}
              title={t('noCommentsTitle')}
              description={t('noCommentsDesc')}
            />
          )
        )}
        {/* 评论卡片列表：按可见数量截断渲染 */}
        {optimisticComments.slice(0, visibleCount).map((c) => {
          /** 当前用户是否为该评论作者（可编辑可删除） */
          const isCommentAuthor = !!user && c.userId === user.id;
          /** 是否可删除：评论作者或文章作者均可 */
          const canDelete =
            isCommentAuthor || (!!user && !!postAuthorId && postAuthorId === user.id);
          /** 评论者姓名拆分（用于头像缩写） */
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
                  <span className="meta-text">{formatRelativeTime(c.createdAt, locale)}</span>
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
                        <Check size={14} strokeWidth={2.5} />
                        {tCommon('save')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setEditText('');
                        }}
                      >
                        {tCommon('cancel')}
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
                            className="text-muted hover:text-heading text-(length:--type-xs) leading-normal transition-colors duration-150 ease-out"
                          >
                            {tCommon('edit')}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTargetId(c.id)}
                            className="text-muted hover:text-heading text-(length:--type-xs) leading-normal transition-colors duration-150 ease-out"
                          >
                            {tCommon('delete')}
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
        {/* 加载更多：剩余数量提示按钮 */}
        {/* 加载更多：剩余数量提示按钮 */}
        {optimisticComments.length > visibleCount && (
          <div className="mt-6 text-center">
            <Button variant="ghost" size="sm" onClick={() => setVisibleCount((c) => c + 5)}>
              {t('loadMoreComments', { count: optimisticComments.length - visibleCount })}
            </Button>
          </div>
        )}
      </div>

      {/* 删除确认弹窗：确认后调用接口，成功刷新列表并同步评论计数 -1 */}
      <Modal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title={t('deleteCommentTitle')}
      >
        <p className="text-body text-(length:--type-base) leading-normal">
          {t('deleteCommentDesc')}
        </p>
        <div className="mt-8 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTargetId(null)}>
            {tCommon('cancel')}
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
            <Trash2 size={16} strokeWidth={2.5} />
            {t('confirmDeleteBtn')}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
