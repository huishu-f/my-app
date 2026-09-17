/**
 * @file CommentsSection.tsx
 * @description 文章评论区：分页展示评论、登录后可发表/编辑/删除，新建评论走 useOptimistic 乐观插入，并同步更新文章评论数
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

/** 数据未就绪时的空列表兜底常量，保持引用稳定避免子组件重渲染 */
const EMPTY_COMMENTS: Comment[] = [];

/**
 * CommentsSection 评论区
 * @param props {@link CommentsSectionProps}
 */
export function CommentsSection({ postId, user: ssrUser, postAuthorId }: CommentsSectionProps) {
  const t = useTranslations('post');

  const tCommon = useTranslations('common');

  const locale = useLocale() as Locale;

  /** 评论列表查询，含加载中/错误标记与重新拉取方法 */
  const {
    data: commentsData,
    isLoading: isLoadingComments,
    isError,
    refetch: refetchComments,
  } = useComments(postId);

  /** 服务端返回的评论数组，未就绪时兜底为空数组常量 */
  const comments = commentsData?.comments ?? EMPTY_COMMENTS;

  /** 发表评论请求 */
  const createCommentMutation = useCreateComment(postId);

  /** 编辑评论请求 */
  const updateCommentMutation = useUpdateComment();

  /** 删除评论请求 */
  const deleteCommentMutation = useDeleteComment();

  /** 复用详情页鉴权：得到当前用户、更新文章的方法与需登录才执行的操作包装 */
  const { user, updatePost, requireAuth } = usePostPageAuth(postId, ssrUser);

  /** 乐观评论列表：提交时把新评论即时插到最前，transition 结束后回退到服务端数据 */
  const [optimisticComments, addOptimisticComment] = useOptimistic<Comment[], Comment>(
    comments,
    (current, newComment) => [newComment, ...current],
  );

  /** 发表评论的 transition 进行中标记，用于按钮加载态 */
  const [isPending, startTransition] = useTransition();

  /** 新评论输入框内容 */
  const [commentText, setCommentText] = useState('');

  /** 当前处于编辑态的评论 id，null 表示无编辑 */
  const [editingId, setEditingId] = useState<string | null>(null);

  /** 编辑态评论的草稿内容 */
  const [editText, setEditText] = useState('');

  /** 当前展示的评论条数，初始 5 条，点击加载更多每次 +5 */
  const [visibleCount, setVisibleCount] = useState(5);

  /** 待删除评论的 id，非 null 时打开删除确认弹窗 */
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const submitComment = () => {
    const text = commentText.trim();
    if (!text) return;
    requireAuth(() => {
      startTransition(async () => {
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

  const startEdit = (cId: string, content: string) => {
    setEditingId(cId);
    setEditText(content);
  };

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
      <h2 className="section-title mb-6">
        {t('commentsTitle')}{' '}
        <span className="text-muted ml-1.5 text-(length:--type-xs) font-normal opacity-80">
          · {optimisticComments.length}
        </span>
      </h2>

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
          <div className="card border-stroke text-muted rounded-xl border p-6 text-center text-(length:--type-xs) leading-normal">
            <Link href={`/login?redirect=/posts/${postId}`} className="text-accent hover:underline">
              {t('commentLoginBefore')}
            </Link>
            {t('commentLoginAfter')}
          </div>
        )}
      </div>

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
        ) : isLoadingComments ? (
          // 加载中渲染骨架，避免闪现"暂无评论"空态（ssr:false 客户端拉取，每次进详情页都会经过这里）
          <div className="card-list" aria-busy="true" aria-label={t('commentsTitle')}>
            <div className="card p-5">
              <div className="bg-surface h-4 w-1/3 animate-pulse rounded-md" />
              <div className="bg-surface mt-3 h-3 w-2/3 animate-pulse rounded-md" />
              <div className="bg-surface mt-2 h-3 w-1/2 animate-pulse rounded-md" />
            </div>
          </div>
        ) : (
          optimisticComments.length === 0 && (
            <EmptyState
              icon={<MessageCircle size={20} strokeWidth={2.5} />}
              title={t('noCommentsTitle')}
              description={t('noCommentsDesc')}
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
                  <span className="text-heading text-(length:--type-sm) leading-normal font-semibold">
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
                    <p className="text-body text-(length:--type-sm) leading-normal break-words">
                      {c.content}
                    </p>
                    {(isCommentAuthor || canDelete) && (
                      <div className="row-sm mt-3">
                        {isCommentAuthor && (
                          <button
                            onClick={() => startEdit(c.id, c.content)}
                            className="text-muted hover:text-heading text-(length:--type-2xs) leading-normal transition-colors duration-150 ease-out"
                          >
                            {tCommon('edit')}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTargetId(c.id)}
                            className="text-muted hover:text-heading text-(length:--type-2xs) leading-normal transition-colors duration-150 ease-out"
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
        {optimisticComments.length > visibleCount && (
          <div className="mt-6 text-center">
            <Button variant="ghost" size="sm" onClick={() => setVisibleCount((c) => c + 5)}>
              {t('loadMoreComments', { count: optimisticComments.length - visibleCount })}
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title={t('deleteCommentTitle')}
      >
        <p className="text-body text-(length:--type-sm) leading-normal">{t('deleteCommentDesc')}</p>
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
