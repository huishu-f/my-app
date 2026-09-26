"use server";

// ponytail: 本文件是 Server Actions 模块，不是 HTTP controller —— 不接 Request、
// 不解析响应、不设状态码。真正的 Route Handler 包装器叫 defineRoute。

import { revalidatePath } from "next/cache";
import { getAuthPayload } from "@server/auth/auth.service";
import { createComment, updateComment, deleteComment } from "@server/comment/comment.service";
import { parseCreateCommentBody } from "@server/comment/comment.validator";
import { invalidatePostCache } from "@server/blog/blog.cache";
import { isRateLimited } from "@server/common/rate-limit";
import { NotFoundError, UnauthorizedError, RateLimitError } from "@server/common/errors";
import { toFailure, clientIp, type ActionResult } from "@server/common/action-result";
import { postPath } from "@my-app/shared";
import { routing } from "@/i18n/routing";
import type { Comment, CreateCommentDto } from "@my-app/shared";

/**
 * ponytail: 按具体 URL 失效，而不是动态段字面量 —— 后者会把该路由下所有已生成页面
 * 一并作废，一条评论就清空全站文章页的 ISR 缓存。
 */
function revalidateCommentPages(postId?: string): void {
  if (!postId) return;
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}${postPath(postId)}`);
  }
}

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
    // 评论只影响这一篇的详情（评论列表/计数）+ 列表卡片数据，不必全量失效。
    invalidatePostCache(id);
    revalidateCommentPages(id);
    return { ok: true, data: comment };
  } catch (err) {
    return toFailure(err, "Comment");
  }
}

export async function updateCommentAction(
  commentId: string,
  input: CreateCommentDto,
): Promise<ActionResult<Comment>> {
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
  try {
    const user = await getAuthPayload();
    if (!user) throw new UnauthorizedError();

    const id = commentId?.trim();
    if (!id) throw new NotFoundError("Comment not found");

    const deleted = await deleteComment(id, user.id);
    invalidatePostCache(deleted.postId);
    revalidateCommentPages(deleted.postId);
    return { ok: true, data: null };
  } catch (err) {
    return toFailure(err, "Comment");
  }
}
