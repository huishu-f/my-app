import "server-only";

import type { Comment } from "@my-app/shared";
import { randomUUID } from "node:crypto";
import { ForbiddenError, NotFoundError, ValidationError } from "@server/common/errors";
import sanitizeHtml from "sanitize-html";
import type { CreateCommentDto, ListCommentsOptions } from "@my-app/shared";
import { findUserById } from "@server/user/user.repository";
import { getPrisma } from "@/lib/prisma/db";
import {
  assertPostReadable,
  assertPostCommentable,
} from "@server/blog/blog.service";
import { incrementPostField } from "@server/blog/blog.repository";
import {
  findCommentsByPostId,
  countComments,
  createCommentRecord,
  deleteCommentRecord,
  findCommentById,
  findCommentForDelete,
  updateCommentRecord,
  updateCommentsAuthor,
} from "./comment.repository";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function sanitizeCommentContent(content: string): string {
  return sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} }).trim();
}

export async function listComments(
  options: ListCommentsOptions,
): Promise<{ comments: Comment[]; total: number; hasMore: boolean }> {
  await assertPostReadable(options.postId, options.user?.id);

  const take = Math.min(MAX_PAGE_SIZE, Math.max(1, options.limit ?? DEFAULT_PAGE_SIZE));
  const skip = Math.max(0, options.offset ?? 0);

  const [rows, total] = await Promise.all([
    findCommentsByPostId(options.postId, { take: take + 1, skip }),
    countComments(options.postId),
  ]);

  const hasMore = rows.length > take;
  return { comments: hasMore ? rows.slice(0, take) : rows, total, hasMore };
}

export async function createComment(
  dto: CreateCommentDto & { postId: string; userId: string },
): Promise<Comment> {
  await assertPostCommentable(dto.postId);

  const user = await findUserById(dto.userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const now = new Date().toISOString();
  const comment: Comment = {
    id: randomUUID(),
    postId: dto.postId,
    userId: dto.userId,
    userName: `${user.firstName} ${user.lastName}`.trim() || user.username,
    userAvatar: user.avatar || undefined,
    content: sanitizeCommentContent(dto.content),
    createdAt: now,
    updatedAt: now,
  };

  await getPrisma().$transaction(async (tx) => {
    await createCommentRecord(comment, tx);
    await incrementPostField(dto.postId, "commentsCount", 1, tx);
  });

  return comment;
}

export async function updateComment(
  id: string,
  content: string,
  currentUserId: string,
): Promise<Comment> {
  const row = await findCommentById(id);
  if (!row) {
    throw new NotFoundError("Comment not found");
  }
  if (row.userId !== currentUserId) {
    throw new ForbiddenError("Not authorized to edit this comment");
  }

  const trimmed = sanitizeCommentContent(content);
  if (trimmed.length === 0) {
    throw new ValidationError("Comment content cannot be empty");
  }

  const now = new Date().toISOString();
  const updated = await updateCommentRecord(id, { content: trimmed, updatedAt: now });
  if (!updated) {
    throw new NotFoundError("Comment not found");
  }
  return updated;
}

/**
 * ponytail: 删除与计数递减必须在同一事务里。此前创建侧用事务、删除侧没有，
 * 于是计数只会偏高，且中间失败即永久错数。
 */
export async function deleteComment(
  id: string,
  currentUserId: string,
): Promise<{ postId: string }> {
  const row = await findCommentForDelete(id);
  if (!row) {
    throw new NotFoundError("Comment not found");
  }

  const isCommentAuthor = row.userId === currentUserId;
  const isPostAuthor = row.postAuthorId === currentUserId;
  if (!isCommentAuthor && !isPostAuthor) {
    throw new ForbiddenError("Not authorized to delete this comment");
  }

  await getPrisma().$transaction(async (tx) => {
    await deleteCommentRecord(id, tx);
    await incrementPostField(row.postId, "commentsCount", -1, tx);
  });

  return { postId: row.postId };
}

/**
 * 改名级联入口：作者改名/换头像后同步其全部评论的冗余副本。
 * 供 auth 域调用（auth 不直接穿透到 comment 的 repository），返回同步条数。
 */
export async function syncCommentAuthorProfile(
  userId: string,
  userName: string,
  userAvatar: string | null,
): Promise<number> {
  return updateCommentsAuthor(userId, userName, userAvatar);
}
