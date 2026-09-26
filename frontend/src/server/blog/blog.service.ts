import "server-only";

import { randomUUID } from "node:crypto";
import { after } from "next/server";

import type { Post } from "@my-app/shared";
import {
  NotFoundError,
  UnprocessableEntityError,
  ValidationError,
  ForbiddenError,
} from "@server/common/errors";
import { logger } from "@server/common/logger";
import type {
  CreatePostDto,
  ListPostsOptions,
  PostsListData,
  UpdatePostDto,
  NeighborPostsData,
} from "@my-app/shared";
import {
  IMAGE_URL_INVALID_MESSAGE,
  assertValidPostId,
  isSafeImageUrl,
  isValidPostId,
} from "@my-app/shared";
import { stripMarkdown } from "@/lib/markdown";
import { getPrisma } from "@/lib/prisma/db";
import { renderMarkdown } from "./markdown.service";
import type { PostUpdateData } from "./blog.repository";
import {
  findPostById,
  findPosts,
  countPosts,
  createPostRecord,
  updatePostRecord,
  deletePostRecord,
  incrementPostField,
  findRenamedPostId as findRenamedPostIdInDb,
  findNeighborPosts,
  findPostStatus,
  updatePostAuthorName,
} from "./blog.repository";
import {
  findUserById,
  incrementUserStats,
  toggleUserAssociation,
} from "@server/user/user.repository";

function generateSummary(content: string): string {
  const plain = stripMarkdown(content)
    .replace(/\n{2,}/g, " ")
    .trim();
  if (!plain) return "(No content summary)";
  const summary = plain.slice(0, 100);
  return plain.length > 100 ? `${summary}...` : summary;
}

function generatePostId(): string {
  const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  assertValidPostId(id);
  return id;
}

function parseTags(input: string | string[] | undefined): string[] {
  if (input === undefined || input === null) return [];
  const rawArray = Array.isArray(input) ? input : input.split(",");
  const tags = [
    ...new Set(rawArray.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0)),
  ].slice(0, 20);
  return tags;
}

function validateCoverImage(value: string | undefined): void {
  if (value === undefined || value === "") return;
  if (!isSafeImageUrl(value)) {
    throw new UnprocessableEntityError(`Invalid cover image URL: ${IMAGE_URL_INVALID_MESSAGE}`);
  }
}

function normalizeText(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ValidationError(`${field} cannot be empty`);
  }
  return trimmed;
}

function assertPostOwner(post: Post, currentUserId: string): void {
  if (!post.authorId) {
    throw new ForbiddenError("This post has no author info, cannot perform action");
  }
  if (post.authorId !== currentUserId) {
    throw new ForbiddenError("Not authorized to modify this post");
  }
}

function sortPosts(posts: Post[], isDraftMode: boolean): Post[] {
  if (isDraftMode) {
    return posts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return posts.sort((a, b) => {
    const pinnedA = a.pinned ? 1 : 0;
    const pinnedB = b.pinned ? 1 : 0;
    if (pinnedA !== pinnedB) return pinnedB - pinnedA;
    const pa = a.publishedAt || a.createdAt;
    const pb = b.publishedAt || b.createdAt;
    return pb.localeCompare(pa);
  });
}

export async function listPosts(options: ListPostsOptions): Promise<PostsListData> {
  const isDraftMode = options.draft === true;
  const hasUser = !!options.user;

  if (isDraftMode && !hasUser) {
    return {
      posts: [],
      total: 0,
      page: options.page ?? 1,
      limit: options.limit ?? 10,
      totalPages: 0,
    };
  }

  const maxLimit = options.internal ? 1000 : 100;
  const limit = Math.min(maxLimit, Math.max(1, options.limit ?? 10));
  const page = Math.max(1, options.page ?? 1);
  const skip = (page - 1) * limit;

  const category = options.category?.trim();
  const tag = options.tag?.trim();
  const q = options.q?.trim();

  // isDraft / authorId / category / tag / q 全部下推 DB（authorId 保证他人草稿
  // 不会被捞进内存），搜索与普通列表走同一条 findMany + count 路径，
  // total 不再受捞取上限截断，totalPages 恒准确。
  const whereOpts = {
    isDraft: isDraftMode ? true : false,
    ...(isDraftMode && options.user ? { authorId: options.user!.id } : {}),
    ...(category ? { category } : {}),
    ...(tag ? { tag } : {}),
    ...(q ? { q } : {}),
  };

  const [posts, total] = await Promise.all([
    findPosts({
      ...whereOpts,
      orderBy: isDraftMode
        ? { field: "updatedAt", direction: "desc" }
        : { field: "publishedAt", direction: "desc" },
      pinnedFirst: !isDraftMode,
      skip,
      take: limit,
    }),
    countPosts(whereOpts),
  ]);

  return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getPost(id: string, user?: { id: string }): Promise<Post> {
  const post = await findPostById(id);
  if (!post) {
    throw new NotFoundError("Post not found");
  }
  if (post.isDraft) {
    if (!user || user.id !== post.authorId) {
      throw new NotFoundError("Post not found");
    }
  }

  return {
    ...post,
    content: renderMarkdown(post.content),
    contentRaw: post.content,
  };
}

export async function incrementView(id: string): Promise<void> {
  const post = await findPostStatus(id);
  if (!post || post.isDraft) return;

  const postId = post.id;
  const authorId = post.authorId;

  after(async () => {
    try {
      // ponytail: post.views 与 user.statsViews 是同一事实的两份副本，
      // 必须同事务写入，否则第二步失败即永久漂移（无明细表可对账）。
      await getPrisma().$transaction(async (tx) => {
        await incrementPostField(postId, "views", 1, tx);
        if (authorId) {
          await incrementUserStats(authorId, "views", 1, tx);
        }
      });
      // ponytail: 这行 info 是刻意的可观测锚点。after() 依赖平台的 waitUntil 支持，
      // 而它在 Netlify 上是否真的执行无法从代码静态确认。部署后在函数日志里搜
      // "View recorded"：搜得到说明后台写生效；一条都没有就说明平台不支持，
      // 此时需把写入改为同步执行（客户端本来就是 fire-and-forget，不会阻塞 UI）。
      logger.info("View recorded", { postId });
    } catch (err) {
      logger.error("Failed to record view count", {
        postId,
        authorId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}

export async function createPost(dto: CreatePostDto & { authorId: string }): Promise<Post> {
  const title = normalizeText(dto.title, "title");
  const content = normalizeText(dto.content, "content");
  const category = normalizeText(dto.category, "category");
  validateCoverImage(dto.coverImage);

  const author = await findUserById(dto.authorId);
  if (!author) {
    throw new NotFoundError("Author not found");
  }

  const now = new Date().toISOString();
  const tags = parseTags(dto.tags);
  const summary = dto.summary?.trim() || generateSummary(content);
  const isDraft = Boolean(dto.isDraft);

  const post: Post = {
    id: generatePostId(),
    title,
    summary,
    content,
    category,
    tags,
    createdAt: now,
    updatedAt: now,
    isDraft,
    pinned: isDraft ? false : Boolean(dto.pinned),
    coverImage: dto.coverImage?.trim() || undefined,
    authorId: dto.authorId,
    authorName: `${author.firstName} ${author.lastName}`.trim() || author.username,
    views: 0,
    likes: 0,
    favorites: 0,
    commentsCount: 0,
  };

  if (!isDraft) {
    post.publishedAt = now;
  }

  await getPrisma().$transaction(async (tx) => {
    await createPostRecord(post, tx);

    if (!isDraft) {
      await incrementUserStats(dto.authorId, "articles", 1, tx);
    }
  });

  return post;
}

export async function updatePost(
  id: string,
  dto: UpdatePostDto,
  currentUserId: string,
): Promise<Post> {
  const existing = await findPostById(id);
  if (!existing) {
    throw new NotFoundError("Post not found");
  }
  assertPostOwner(existing, currentUserId);

  const title = dto.title !== undefined ? normalizeText(dto.title, "title") : existing.title;
  const content =
    dto.content !== undefined ? normalizeText(dto.content, "content") : existing.content;
  const category =
    dto.category !== undefined ? normalizeText(dto.category, "category") : existing.category;

  if (dto.coverImage !== undefined) {
    validateCoverImage(dto.coverImage);
  }

  const isDraft = dto.isDraft !== undefined ? Boolean(dto.isDraft) : existing.isDraft;
  const wasDraft = existing.isDraft;

  let summary = existing.summary;
  if (dto.summary !== undefined) {
    summary = dto.summary.trim();
  } else if (dto.content !== undefined) {
    summary = generateSummary(content);
  }

  const now = new Date().toISOString();

  // ponytail: 清空可空字段必须发 null，不能发 undefined —— undefined 在映射层是「不修改」。
  const updateData: PostUpdateData = {
    title,
    content,
    category,
    summary,
    tags: dto.tags !== undefined ? parseTags(dto.tags) : existing.tags,
    isDraft,
    pinned: isDraft ? false : dto.pinned !== undefined ? Boolean(dto.pinned) : existing.pinned,
    coverImage:
      dto.coverImage !== undefined ? dto.coverImage.trim() || null : existing.coverImage,
    updatedAt: now,
  };

  if (wasDraft && !isDraft) {
    updateData.publishedAt = now;
  }

  if (!wasDraft && isDraft) {
    updateData.publishedAt = null;
  }

  return getPrisma().$transaction(async (tx) => {
    const updated = await updatePostRecord(id, updateData, tx);

    if (wasDraft && !updated.isDraft) {
      if (existing.authorId) {
        await incrementUserStats(existing.authorId, "articles", 1, tx);
      }
    } else if (!wasDraft && updated.isDraft) {
      if (existing.authorId) {
        await incrementUserStats(existing.authorId, "articles", -1, tx);
      }
    }
    return updated;
  });
}

export async function deletePost(id: string, currentUserId: string): Promise<void> {
  const post = await findPostById(id);
  if (!post) {
    throw new NotFoundError("Post not found");
  }
  assertPostOwner(post, currentUserId);

  await getPrisma().$transaction(async (tx) => {
    await deletePostRecord(id, tx);
    if (!post.isDraft && post.authorId) {
      await incrementUserStats(post.authorId, "articles", -1, tx);
    }
  });
}

export async function likePost(
  id: string,
  currentUserId: string,
): Promise<{ liked: boolean; likes: number }> {
  const result = await toggleUserPostAssociation(id, currentUserId, "likedArticles", "likes");
  return { liked: !result.wasPresent, likes: result.count };
}

export async function toggleFavorite(
  id: string,
  currentUserId: string,
): Promise<{ favorited: boolean; favorites: number }> {
  const result = await toggleUserPostAssociation(
    id,
    currentUserId,
    "favoritedArticles",
    "favorites",
  );
  return { favorited: !result.wasPresent, favorites: result.count };
}

/**
 * ponytail: 关系表 / Post 计数 / User.stats 三份副本此前由三次独立写操作更新，
 * 只有第一步在事务里，中间失败只能靠手工回滚（进程被回收即失效）。
 * 现在整组写操作在同一个事务内完成，任一步失败即整体回滚，不再有中间态。
 */
async function toggleUserPostAssociation(
  id: string,
  currentUserId: string,
  userField: "likedArticles" | "favoritedArticles",
  postField: "likes" | "favorites",
): Promise<{ wasPresent: boolean; count: number; authorId?: string }> {
  const post = await findPostStatus(id);
  if (!post) throw new NotFoundError("Post not found");
  if (post.isDraft) throw new ForbiddenError("Cannot perform action on draft post");

  const authorId = post.authorId;
  const tracksAuthorStats = userField === "likedArticles";

  return getPrisma().$transaction(async (tx) => {
    const wasPresent = await toggleUserAssociation(currentUserId, userField, id, tx);
    const delta = wasPresent ? -1 : 1;

    const count = await incrementPostField(id, postField, delta, tx);

    if (tracksAuthorStats && authorId) {
      await incrementUserStats(authorId, "likes", delta, tx);
    }

    return { wasPresent, count, authorId: authorId ?? undefined };
  });
}

export async function listFavoritePosts(currentUserId: string): Promise<Post[]> {
  const user = await findUserById(currentUserId, { withAssociations: true });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  const favoritedIds = user.favoritedArticles ?? [];
  if (favoritedIds.length === 0) {
    return [];
  }

  const posts = await findPosts({ ids: favoritedIds, isDraft: false });
  return posts.sort((a, b) => {
    const pa = a.publishedAt || a.createdAt;
    const pb = b.publishedAt || b.createdAt;
    return pb.localeCompare(pa);
  });
}

export async function listPostsByAuthor(authorId: string): Promise<Post[]> {
  const posts = await findPosts({ authorId, isDraft: false });
  return sortPosts(posts, false);
}

export async function getNeighborPosts(
  id: string,
): Promise<{ prev: Post | null; next: Post | null }> {
  const post = await findPostById(id);
  if (!post) return { prev: null, next: null };
  return findNeighborPosts(id, post.publishedAt ?? null, post.createdAt);
}

export async function assertPostReadable(postId: string, userId?: string): Promise<{ id: string }> {
  const post = await findPostStatus(postId);
  if (!post) {
    throw new NotFoundError("Post not found");
  }
  if (post.isDraft && post.authorId !== userId) {
    throw new NotFoundError("Post not found");
  }
  return post;
}

export async function assertPostCommentable(postId: string): Promise<void> {
  const post = await findPostStatus(postId);
  if (!post) {
    throw new NotFoundError("Post not found");
  }
  if (post.isDraft) {
    throw new ForbiddenError("Cannot comment on draft posts");
  }
}

export async function findRenamedPostId(oldId: string): Promise<string | null> {
  if (isValidPostId(oldId)) return null;
  const newId = await findRenamedPostIdInDb(oldId);
  return newId && isValidPostId(newId) ? newId : null;
}

/**
 * 改名级联入口：作者改名后同步其全部文章的 authorName 冗余副本。
 * 供 auth 域调用（auth 不直接穿透到 blog 的 repository）。
 */
export async function syncPostAuthorName(userId: string, authorName: string): Promise<void> {
  await updatePostAuthorName(userId, authorName);
}

export type { NeighborPostsData };
