import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import type { Post } from "@my-app/shared";
import { getPrisma } from "@/lib/prisma/db";

type Tx = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

type PrismaPost = {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  isDraft: boolean;
  pinned: boolean;
  coverImage: string | null;
  authorId: string | null;
  authorName: string | null;
  views: number;
  likes: number;
  favorites: number;
  commentsCount: number;
};

/** DB 层 DateTime 与领域类型（ISO 字符串）的唯一换算点，保持 API 面不变。 */
function iso(d: Date): string {
  return d.toISOString();
}

export function mapToPost(p: PrismaPost): Post {
  return {
    id: p.id,
    title: p.title,
    summary: p.summary,
    content: p.content,
    category: p.category,
    tags: p.tags,
    createdAt: iso(p.createdAt),
    updatedAt: iso(p.updatedAt),
    publishedAt: p.publishedAt ? iso(p.publishedAt) : undefined,
    isDraft: p.isDraft,
    pinned: p.pinned,
    coverImage: p.coverImage ?? undefined,
    authorId: p.authorId ?? undefined,
    authorName: p.authorName ?? undefined,
    views: p.views,
    likes: p.likes,
    favorites: p.favorites,
    commentsCount: p.commentsCount,
  };
}

/**
 * ponytail: 列表/搜索/邻居查询显式排除 content。列表卡片渲染只用 summary，
 * 正文却占了整行 95%+ 的体积 —— 不 select 时 sitemap 会一次跨太平洋搬回约 1000 篇全文。
 * 列表形态的 Post 里 content 恒为空串，任何需要正文的场景请走 findPostById。
 */
const POST_LIST_SELECT = {
  id: true,
  title: true,
  summary: true,
  category: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
  isDraft: true,
  pinned: true,
  coverImage: true,
  authorId: true,
  authorName: true,
  views: true,
  likes: true,
  favorites: true,
  commentsCount: true,
} as const;

type PrismaPostList = Omit<PrismaPost, "content">;

function mapToListPost(p: PrismaPostList): Post {
  return mapToPost({ ...p, content: "" });
}

export interface PostQueryOptions {
  isDraft?: boolean;
  authorId?: string;
  category?: string;
  tag?: string;
  q?: string;
  ids?: string[];
  orderBy?: { field: "publishedAt" | "createdAt" | "updatedAt"; direction: "asc" | "desc" };
  pinnedFirst?: boolean;
  skip?: number;
  take?: number;
}

export async function findPostById(id: string): Promise<Post | null> {
  const post = await getPrisma().post.findUnique({ where: { id } });
  return post ? mapToPost(post) : null;
}

function buildPrismaWhere(where: PostQueryOptions): Prisma.PostWhereInput {
  const prismaWhere: Prisma.PostWhereInput = {};
  if (where.isDraft !== undefined) prismaWhere.isDraft = where.isDraft;
  if (where.authorId) prismaWhere.authorId = where.authorId;
  if (where.category) prismaWhere.category = where.category;
  if (where.tag) prismaWhere.tags = { has: where.tag };
  if (where.ids && where.ids.length > 0) prismaWhere.id = { in: where.ids };
  // ponytail: 搜索条件同样下推 DB。此前先把（最多 1000 篇）命中行全捞进内存，
  // 再在 JS 里过滤 category/tag、排序、slice 分页 —— total 被捞取上限截断，
  // 结果超过上限时 totalPages 是错的，后面的页永远翻不到。
  if (where.q) {
    prismaWhere.OR = [
      { title: { contains: where.q, mode: "insensitive" } },
      { content: { contains: where.q, mode: "insensitive" } },
    ];
  }
  return prismaWhere;
}

export async function findPosts(where: PostQueryOptions): Promise<Post[]> {
  const orderBy: Prisma.PostOrderByWithRelationInput[] = [];
  if (where.pinnedFirst) orderBy.push({ pinned: "desc" });

  const sortField = where.orderBy?.field ?? "publishedAt";
  const sortDir = where.orderBy?.direction ?? "desc";

  // ponytail: Postgres 的 ORDER BY x DESC 默认 NULLS FIRST，一篇「已发布但 publishedAt
  // 为空」的文章会被顶到列表最前面。显式 last 让空值沉底。
  // 分支写死而不是用计算属性 key，这样 Prisma 能对字段名和排序方向做编译期校验。
  if (sortField === "publishedAt") orderBy.push({ publishedAt: { sort: sortDir, nulls: "last" } });
  else if (sortField === "createdAt") orderBy.push({ createdAt: sortDir });
  else orderBy.push({ updatedAt: sortDir });

  const posts = await getPrisma().post.findMany({
    where: buildPrismaWhere(where),
    orderBy,
    select: POST_LIST_SELECT,
    ...(where.skip !== undefined && { skip: where.skip }),
    ...(where.take !== undefined && { take: where.take }),
  });
  return posts.map(mapToListPost);
}

export async function countPosts(where: PostQueryOptions): Promise<number> {
  return getPrisma().post.count({ where: buildPrismaWhere(where) });
}

export async function getCategoriesFromDb(): Promise<string[]> {
  const rows = await getPrisma().post.findMany({
    where: { isDraft: false },
    select: { category: true },
    distinct: ["category"],
  });
  return rows.map((r) => r.category).filter(Boolean);
}

export async function getTagsFromDb(): Promise<{ name: string; count: number }[]> {
  const rows = await getPrisma().$queryRaw<{ tag: string; count: bigint }[]>`
    SELECT tag, COUNT(*)::bigint as count
    FROM (
      SELECT unnest(tags) AS tag FROM "Post" WHERE "isDraft" = false
    ) t
    GROUP BY tag
    ORDER BY tag
  `;
  return rows.map((r) => ({ name: r.tag, count: Number(r.count) }));
}

function postToCreateData(p: Post): Prisma.PostUncheckedCreateInput {
  return {
    id: p.id,
    title: p.title,
    summary: p.summary,
    content: p.content,
    category: p.category,
    tags: p.tags,
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
    publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
    isDraft: p.isDraft,
    pinned: p.pinned ?? false,
    coverImage: p.coverImage ?? null,
    authorId: p.authorId ?? null,
    authorName: p.authorName ?? null,
    views: p.views ?? 0,
    likes: p.likes ?? 0,
    favorites: p.favorites ?? 0,
    commentsCount: p.commentsCount ?? 0,
  };
}

/**
 * 更新载荷。可空字段用 `null` 表示「清空为 NULL」，用 `undefined`（即缺省）表示「不修改」——
 * 两种语义必须分开。此前 service 用 undefined 表达清空，而映射层把 undefined 当「不动」，
 * 导致「取消发布不清 publishedAt」「删不掉封面图」。
 */
export type PostUpdateData = Partial<{
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  isDraft: boolean;
  pinned: boolean;
  coverImage: string | null;
  authorId: string | null;
  authorName: string | null;
  views: number;
  likes: number;
  favorites: number;
  commentsCount: number;
}>;

function postToUpdateData(data: PostUpdateData): Prisma.PostUncheckedUpdateInput {
  const result: Prisma.PostUncheckedUpdateInput = {};
  if (data.title !== undefined) result.title = data.title;
  if (data.summary !== undefined) result.summary = data.summary;
  if (data.content !== undefined) result.content = data.content;
  if (data.category !== undefined) result.category = data.category;
  if (data.tags !== undefined) result.tags = data.tags;
  if (data.createdAt !== undefined) result.createdAt = new Date(data.createdAt);
  if (data.updatedAt !== undefined) result.updatedAt = new Date(data.updatedAt);
  if (data.publishedAt !== undefined)
    result.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
  if (data.isDraft !== undefined) result.isDraft = data.isDraft;
  if (data.pinned !== undefined) result.pinned = data.pinned;
  if (data.coverImage !== undefined) result.coverImage = data.coverImage ?? null;
  if (data.authorId !== undefined) result.authorId = data.authorId ?? null;
  if (data.authorName !== undefined) result.authorName = data.authorName ?? null;
  if (data.views !== undefined) result.views = data.views;
  if (data.likes !== undefined) result.likes = data.likes;
  if (data.favorites !== undefined) result.favorites = data.favorites;
  if (data.commentsCount !== undefined) result.commentsCount = data.commentsCount;
  return result;
}

export async function createPostRecord(post: Post, tx?: Tx): Promise<void> {
  const client = tx ?? getPrisma();
  await client.post.create({ data: postToCreateData(post) });
}

export async function updatePostRecord(
  id: string,
  data: PostUpdateData,
  tx?: Tx,
): Promise<Post> {
  const client = tx ?? getPrisma();
  const updated = await client.post.update({
    where: { id },
    data: postToUpdateData(data),
  });
  return mapToPost(updated);
}

export async function deletePostRecord(id: string, tx?: Tx): Promise<void> {
  const client = tx ?? getPrisma();
  await client.post.delete({ where: { id } });
}

/** 递增计数并返回递增后的真实值（用于把准确计数回给客户端，而不是靠读旧值估算）。 */
export async function incrementPostField(
  id: string,
  field: "views" | "likes" | "favorites" | "commentsCount",
  delta: number,
  tx?: Tx,
): Promise<number> {
  const client = tx ?? getPrisma();
  const updated = await client.post.update({
    where: { id },
    data: { [field]: { increment: delta } },
    select: { views: true, likes: true, favorites: true, commentsCount: true },
  });
  return updated[field];
}

export async function findRenamedPostId(oldId: string): Promise<string | null> {
  const map = await getPrisma().postIdMap.findUnique({ where: { oldId } });
  return map?.newId ?? null;
}

export async function updatePostAuthorName(userId: string, authorName: string): Promise<void> {
  await getPrisma().post.updateMany({
    where: { authorId: userId },
    data: { authorName },
  });
}

export async function findNeighborPosts(
  postId: string,
  publishedAt: string | null,
  createdAt: string,
): Promise<{ prev: Post | null; next: Post | null }> {
  const baseWhere = { isDraft: false, id: { not: postId } };
  const sortKey = publishedAt ?? createdAt;

  const [prevRow, nextRow] = await Promise.all([
    getPrisma().post.findFirst({
      where: {
        ...baseWhere,
        OR: [{ publishedAt: { lt: sortKey } }, { publishedAt: null, createdAt: { lt: createdAt } }],
      },
      orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      select: POST_LIST_SELECT,
    }),
    getPrisma().post.findFirst({
      where: {
        ...baseWhere,
        OR: [{ publishedAt: { gt: sortKey } }, { publishedAt: null, createdAt: { gt: createdAt } }],
      },
      orderBy: [{ publishedAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      select: POST_LIST_SELECT,
    }),
  ]);

  return {
    prev: prevRow ? mapToListPost(prevRow) : null,
    next: nextRow ? mapToListPost(nextRow) : null,
  };
}

export async function findPostStatus(
  id: string,
): Promise<{ id: string; isDraft: boolean; authorId: string | null } | null> {
  const post = await getPrisma().post.findUnique({
    where: { id },
    select: { id: true, isDraft: true, authorId: true },
  });
  return post ?? null;
}

export async function findPostAuthorIdFromDb(postId: string): Promise<string | null | undefined> {
  const post = await getPrisma().post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });
  return post?.authorId;
}
