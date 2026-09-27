"use server";

// ponytail: 本文件是 Server Actions 模块，不是 HTTP controller —— 不接 Request、

import { getAuthPayload } from "@server/auth/auth.service";
import { createComment, updateComment, deleteComment } from "@server/comment/comment.service";
import { parseCreateCommentBody } from "@server/comment/comment.validator";
import { invalidatePostCache, revalidatePostPathAllLocales } from "@server/blog/blog.cache";
import { isRateLimited } from "@server/common/rate-limit";
import { NotFoundError, UnauthorizedError, RateLimitError } from "@server/common/errors";
import { toFailure, clientIp, type ActionResult } from "@server/common/action-result";
import type { Comment, CreateCommentDto } from "@shared";

export async function createCommentAction(
  postId: string,
  input: CreateCommentDto,
): Promise<ActionResult<Comment>> {
  if (await isRateLimited(`comments:create:${await clientIp()}`, 10, 5 * 60_000)) {
    return toFailure(
      new RateLimitError("Commenting too frequent, please try again later"),
      "Comment",
    );
  }

  try {
    const user = await getAuthPayload();
    if (!user) throw new UnauthorizedError();

    const id = postId?.trim();
    if (!id) throw new NotFoundError("Post not found");

    const dto = parseCreateCommentBody(input);
    const comment = await createComment({ ...dto, postId: id, userId: user.id });

    invalidatePostCache(id);
    revalidatePostPathAllLocales(id);
    return { ok: true, data: comment };
  } catch (err) {
    return toFailure(err, "Comment");
  }
}

export async function updateCommentAction(
  commentId: string,
  input: CreateCommentDto,
): Promise<ActionResult<Comment>> {
  if (await isRateLimited(`comments:update:${await clientIp()}`, 30, 60_000)) {
    return toFailure(new RateLimitError("Action too frequent, please try again later"), "Comment");
  }

  try {
    const user = await getAuthPayload();
    if (!user) throw new UnauthorizedError();

    const id = commentId?.trim();
    if (!id) throw new NotFoundError("Comment not found");

    const dto = parseCreateCommentBody(input);
    const comment = await updateComment(id, dto.content, user.id);
    return { ok: true, data: comment };
  } catch (err) {
    return toFailure(err, "Comment");
  }
}

export async function deleteCommentAction(commentId: string): Promise<ActionResult<null>> {
  if (await isRateLimited(`comments:delete:${await clientIp()}`, 30, 60_000)) {
    return toFailure(new RateLimitError("Action too frequent, please try again later"), "Comment");
  }

  try {
    const user = await getAuthPayload();
    if (!user) throw new UnauthorizedError();

    const id = commentId?.trim();
    if (!id) throw new NotFoundError("Comment not found");

    const deleted = await deleteComment(id, user.id);
    invalidatePostCache(deleted.postId);
    revalidatePostPathAllLocales(deleted.postId);
    return { ok: true, data: null };
  } catch (err) {
    return toFailure(err, "Comment");
  }
}
