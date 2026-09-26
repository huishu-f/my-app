"use client";

import { useOptimistic, useTransition, useState } from "react";
import { Link } from "@/i18n/navigation";
import { AlertCircle, MessageCircle, Send, Check, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from "@/hooks/useComments";
import { usePostPageAuth } from "@/hooks/usePostPageAuth";
import {
  resolveSubmitError,
  validateFieldValue,
  type ErrorFeedbackOptions,
} from "@/lib/formFeedback";
import { getInitials, splitName, formatRelativeTime } from "@/lib/format";
import { entityName, msg } from "@/lib/message";
import type { Locale } from "@/i18n/config";
import { COMMENT_MAX_LENGTH, createCommentSchema } from "@my-app/shared";
import { postPath } from "@my-app/shared";
import type { CommentField, CommentsSectionProps, Comment } from "@my-app/shared";
import { CommentCardSkeleton } from "@/components/skeletons/CommentsSkeleton";
import { buildLoginRedirect } from "@/lib/navigation";

const EMPTY_COMMENTS: Comment[] = [];

export function CommentsSection({ postId, user: ssrUser, postAuthorId }: CommentsSectionProps) {
  const t = useTranslations("post");

  const tCommon = useTranslations("common");

  const locale = useLocale() as Locale;

  const {
    data: commentsData,
    isLoading: isLoadingComments,
    isLoadingMore,
    isError,
    refetch: refetchComments,
    loadMore,
    appendComment,
    replaceComment,
    removeComment,
  } = useComments(postId);

  const comments = commentsData?.comments ?? EMPTY_COMMENTS;

  const totalComments = commentsData?.total ?? comments.length;

  const createCommentMutation = useCreateComment(postId);

  const updateCommentMutation = useUpdateComment();

  const deleteCommentMutation = useDeleteComment();

  const { user, updatePost, requireAuth } = usePostPageAuth(postId, ssrUser);

  const [optimisticComments, addOptimisticComment] = useOptimistic<Comment[], Comment>(
    comments,
    (current, newComment) => [newComment, ...current],
  );

  const [isPending, startTransition] = useTransition();

  const [commentText, setCommentText] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  const [editText, setEditText] = useState("");

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [createError, setCreateError] = useState<string | null>(null);

  const [editError, setEditError] = useState<string | null>(null);

  const validateComment = (value: string): string | null =>
    validateFieldValue(createCommentSchema.shape.content, value, t("commentEmpty"));

  const commentLabel = entityName("comment");

  const createErrorRules: ErrorFeedbackOptions<CommentField> = {
    fields: ["content"],
    fallback: msg("create", "failed", { entity: commentLabel }),
  };

  const updateErrorRules: ErrorFeedbackOptions<CommentField> = {
    fields: ["content"],
    fallback: msg("update", "failed", { entity: commentLabel }),
  };

  const deleteErrorRules: ErrorFeedbackOptions<never> = {
    fields: [],
    fallback: msg("delete", "failed", { entity: commentLabel }),
  };

  const submitComment = () => {
    const invalid = validateComment(commentText);
    if (invalid) {
      setCreateError(invalid);
      return;
    }
    setCreateError(null);
    const text = commentText.trim();
    requireAuth(() => {
      startTransition(async () => {
        const tempComment: Comment = {
          id: `optimistic-${Date.now()}`,
          postId,
          userId: user?.id ?? "",
          userName: user ? `${user.firstName} ${user.lastName}` : "",
          userAvatar: user?.avatar || undefined,
          content: text,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addOptimisticComment(tempComment);
        setCommentText("");
        const data = await createCommentMutation.mutate(
          { content: text },
          {
            onError: (err) => {
              const failed = resolveSubmitError(err, createErrorRules);
              setCreateError(failed.fields.content ?? failed.form);
            },
          },
        );
        // 用服务端返回的真实对象落地，transition 结束时乐观项被清除也不会闪回。
        if (data) {
          appendComment(data);
          updatePost((prev) => ({ ...prev, commentsCount: prev.commentsCount + 1 }));
        }
      });
    });
  };

  const startEdit = (cId: string, content: string) => {
    setEditingId(cId);
    setEditText(content);
    setEditError(null);
  };

  const saveEdit = () => {
    const invalid = validateComment(editText);
    if (invalid) {
      setEditError(invalid);
      return;
    }
    setEditError(null);
    if (!editingId) return;
    const text = editText.trim();
    updateCommentMutation.mutate(
      { commentId: editingId, dto: { content: text } },
      {
        onSuccess: (updated) => {
          setEditingId(null);
          setEditText("");
          replaceComment(updated);
        },
        onError: (err) => {
          const failed = resolveSubmitError(err, updateErrorRules);
          setEditError(failed.fields.content ?? failed.form);
        },
      },
    );
  };

  return (
    <section className="mt-10 mb-12">
      <h2 className="section-title mb-6">
        {t("commentsTitle")}{" "}
        <span className="text-muted ml-1.5 text-(length:--type-xs) font-normal opacity-80">
          · {totalComments}
        </span>
      </h2>

      <div className="mb-8">
        {user ? (
          <>
            <textarea
              id="comment-content"
              name="comment"
              aria-label={t("commentPlaceholder")}
              value={commentText}
              onChange={(e) => {
                setCommentText(e.target.value);

                if (createError) setCreateError(null);
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  submitComment();
                }
              }}
              placeholder={t("commentPlaceholder")}
              aria-invalid={!!createError}
              maxLength={COMMENT_MAX_LENGTH}
              rows={4}
              className="textarea-field"
            />
            {createError && (
              <span
                role="alert"
                className="text-state-error mt-2 block text-(length:--type-2xs) leading-normal"
              >
                {createError}
              </span>
            )}
            <div className="mt-4 flex justify-end">
              <Button
                onClick={submitComment}
                disabled={!commentText.trim() || isPending}
                loading={isPending}
              >
                <Send size={16} strokeWidth={2.5} />
                {t("submitComment")}
              </Button>
            </div>
          </>
        ) : (
          <div className="card border-stroke text-muted rounded-xl border p-6 text-center text-(length:--type-xs) leading-normal">
            <Link
              href={buildLoginRedirect(postPath(postId))}
              className="text-accent hover:underline"
            >
              {t("commentLoginBefore")}
            </Link>
            {t("commentLoginAfter")}
          </div>
        )}
      </div>

      <div className="card-list">
        {isError ? (
          <EmptyState
            icon={<AlertCircle size={20} strokeWidth={2.5} />}
            title={t("commentLoadError")}
            action={
              <Button variant="ghost" onClick={() => refetchComments()}>
                {tCommon("retry")}
              </Button>
            }
          />
        ) : isLoadingComments ? (
          <div aria-busy="true" aria-label={t("commentsTitle")}>
            <CommentCardSkeleton />
          </div>
        ) : (
          optimisticComments.length === 0 && (
            <EmptyState
              icon={<MessageCircle size={20} strokeWidth={2.5} />}
              title={t("noCommentsTitle")}
              description={t("noCommentsDesc")}
            />
          )
        )}
        {optimisticComments.map((c) => {
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
                      id={`comment-edit-${c.id}`}
                      name="comment"
                      aria-label={`${tCommon("edit")} ${t("commentsTitle")}`}
                      value={editText}
                      onChange={(e) => {
                        setEditText(e.target.value);

                        if (editError) setEditError(null);
                      }}
                      aria-invalid={!!editError}
                      rows={3}
                      maxLength={COMMENT_MAX_LENGTH}
                      className="textarea-field resize-y"
                    />
                    {editError && (
                      <span
                        role="alert"
                        className="text-state-error mt-2 block text-(length:--type-2xs) leading-normal"
                      >
                        {editError}
                      </span>
                    )}
                    <div className="row-sm mt-4">
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        loading={updateCommentMutation.isPending}
                      >
                        <Check size={14} strokeWidth={2.5} />
                        {tCommon("save")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setEditText("");
                        }}
                      >
                        {tCommon("cancel")}
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
                            className="text-muted hover:text-heading ease-smooth text-(length:--type-2xs) leading-normal transition-colors duration-[var(--duration-fast)]"
                          >
                            {tCommon("edit")}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTargetId(c.id)}
                            className="text-muted hover:text-heading ease-smooth text-(length:--type-2xs) leading-normal transition-colors duration-[var(--duration-fast)]"
                          >
                            {tCommon("delete")}
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
        {commentsData?.hasMore && (
          <div className="mt-6 text-center">
            <Button variant="ghost" size="sm" onClick={loadMore} loading={isLoadingMore}>
              {t("loadMoreComments", {
                count: Math.max(0, totalComments - optimisticComments.length),
              })}
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title={t("deleteCommentTitle")}
      >
        <p className="text-body text-(length:--type-sm) leading-normal">{t("deleteCommentDesc")}</p>
        <div className="mt-8 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTargetId(null)}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="danger"
            loading={deleteCommentMutation.isPending}
            onClick={() => {
              if (deleteTargetId) {
                const targetId = deleteTargetId;
                deleteCommentMutation.mutate(targetId, {
                  onSuccess: () => {
                    removeComment(targetId);
                    updatePost((prev) => ({
                      ...prev,
                      commentsCount: Math.max(0, prev.commentsCount - 1),
                    }));
                  },
                  onError: (err) => {
                    resolveSubmitError(err, deleteErrorRules);
                  },
                  onSettled: () => setDeleteTargetId(null),
                });
              }
            }}
          >
            <Trash2 size={16} strokeWidth={2.5} />
            {t("confirmDeleteBtn")}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
