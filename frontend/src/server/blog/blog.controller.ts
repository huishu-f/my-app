"use server";

// ponytail: 本文件是 Server Actions 模块，不是 HTTP controller —— 不接 Request、
// 不解析响应、不设状态码，只是 "use server" 导出的异步函数集合。
// 真正的 Route Handler 包装器叫 defineRoute（server/common/http/route-handler.ts）。

import { revalidatePath } from "next/cache";
import { getAuthPayload } from "@server/auth/auth.service";
import {
  createPost,
  updatePost,
  deletePost,
  likePost,
  toggleFavorite,
} from "@server/blog/blog.service";
import { parseCreatePostBody, parseUpdatePostBody } from "@server/blog/blog.validator";
import { invalidateBlogCache, invalidatePostCache } from "@server/blog/blog.cache";
import { isRateLimited } from "@server/common/rate-limit";
import { NotFoundError, RateLimitError, UnauthorizedError } from "@server/common/errors";
import { toFailure, clientIp, type ActionResult } from "@server/common/action-result";
import { postPath } from "@my-app/shared";
import { routing } from "@/i18n/routing";
import type {
  AuthPayload,
  CreatePostDto,
  PostData,
  UpdatePostDto,
  LikeData,
  FavoriteToggleData,
} from "@my-app/shared";

export type { ActionResult };

/**
 * ponytail: 按具体 URL 失效，而不是传动态段字面量。
 * `revalidatePath("/[locale]/posts/[id]", "page")` 会作用于该路由下所有已生成页面 ——
 * 一次点赞即清空全站文章页的 ISR 缓存，下一个访客不论访问哪一篇都会回源渲染。
 */
function revalidatePostPage(postId: string): void {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}${postPath(postId)}`);
  }
}

function revalidateListPages(): void {
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/posts", "page");
}

async function runMutation<T>(
  mutate: (user: AuthPayload) => Promise<{ data: T; postId?: string }>,
): Promise<ActionResult<T>> {
  try {
    const user = await getAuthPayload();
    if (!user) throw new UnauthorizedError();

    const { data, postId } = await mutate(user);

    invalidateBlogCache(postId);
    revalidateListPages();
    if (postId) revalidatePostPage(postId);

    return { ok: true, data };
  } catch (err) {
    return toFailure(err, "Posts");
  }
}

export async function createPostAction(input: CreatePostDto): Promise<ActionResult<PostData>> {
  if (await isRateLimited(`posts:create:${await clientIp()}`, 10, 5 * 60_000)) {
    return toFailure(new RateLimitError("Posting too frequent, please try again later"), "Posts");
  }

  return runMutation(async (user) => {
    const dto = parseCreatePostBody(input);
    const post = await createPost({ ...dto, authorId: user.id });

    return { data: { post } };
  });
}

export async function updatePostAction(
  id: string,
  input: UpdatePostDto,
): Promise<ActionResult<PostData>> {
  return runMutation(async (user) => {
    const postId = id?.trim();
    if (!postId) throw new NotFoundError("Post not found");

    const dto = parseUpdatePostBody(input);
    const post = await updatePost(postId, dto, user.id);
    return { data: { post }, postId };
  });
}

export async function deletePostAction(id: string): Promise<ActionResult<null>> {
  return runMutation(async (user) => {
    const postId = id?.trim();
    if (!postId) throw new NotFoundError("Post not found");

    await deletePost(postId, user.id);
    return { data: null, postId };
  });
}

export async function toggleLikeAction(postId: string): Promise<ActionResult<LikeData>> {
  if (await isRateLimited(`posts:like:${await clientIp()}`, 30, 60_000)) {
    return toFailure(
      new RateLimitError("Action too frequent, please try again later"),
      "Interaction",
    );
  }

  try {
    const user = await getAuthPayload();
    if (!user) throw new UnauthorizedError();

    const id = postId?.trim();
    if (!id) throw new NotFoundError("Post not found");

    const result = await likePost(id, user.id);
    // 计数变化只需要刷新被操作的那一篇 + 列表卡片数据，
    // 其它文章的详情缓存与 taxonomy 不必全量打掉。
    invalidatePostCache(id);
    revalidatePostPage(id);
    return { ok: true, data: result };
  } catch (err) {
    return toFailure(err, "Interaction");
  }
}

export async function toggleFavoriteAction(
  postId: string,
): Promise<ActionResult<FavoriteToggleData>> {
  if (await isRateLimited(`posts:favorite:${await clientIp()}`, 30, 60_000)) {
    return toFailure(
      new RateLimitError("Action too frequent, please try again later"),
      "Interaction",
    );
  }

  try {
    const user = await getAuthPayload();
    if (!user) throw new UnauthorizedError();

    const id = postId?.trim();
    if (!id) throw new NotFoundError("Post not found");

    const result = await toggleFavorite(id, user.id);
    invalidatePostCache(id);
    revalidatePostPage(id);
    return { ok: true, data: result };
  } catch (err) {
    return toFailure(err, "Interaction");
  }
}
