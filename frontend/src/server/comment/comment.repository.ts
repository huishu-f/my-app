import "server-only";

import type { PrismaClient } from "@prisma/client";
import type { Comment } from "@my-app/shared";
import { getPrisma } from "@/lib/prisma/db";

type Tx = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

type PrismaComment = {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export function mapToComment(p: PrismaComment): Comment {
  return {
    id: p.id,
    postId: p.postId,
    userId: p.userId,
    userName: p.userName,
    userAvatar: p.userAvatar ?? undefined,
    content: p.content,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

/**
 * ponytail: 分页是必须的 —— 此前一次返回全量评论，「加载更多」只是客户端把数组切段，
 * 首屏就把 2000 条评论（单条上限 2000 字）全部传到浏览器。
 */
export async function findCommentsByPostId(
  postId: string,
  opts?: { take?: number; skip?: number },
): Promise<Comment[]> {
  const rows = await getPrisma().comment.findMany({
    where: { postId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(opts?.take !== undefined && { take: opts.take }),
    ...(opts?.skip !== undefined && { skip: opts.skip }),
  });
  return rows.map(mapToComment);
}

export async function countComments(postId: string): Promise<number> {
  return getPrisma().comment.count({ where: { postId } });
}

export async function createCommentRecord(comment: Comment, tx?: Tx): Promise<void> {
  const client = tx ?? getPrisma();
  await client.comment.create({
    data: {
      id: comment.id,
      postId: comment.postId,
      userId: comment.userId,
      userName: comment.userName,
      userAvatar: comment.userAvatar ?? null,
      content: comment.content,
      createdAt: new Date(comment.createdAt),
      updatedAt: new Date(comment.updatedAt),
    },
  });
}

export async function deleteCommentRecord(id: string, tx?: Tx): Promise<void> {
  const client = tx ?? getPrisma();
  await client.comment.delete({ where: { id } });
}

export async function findCommentById(id: string): Promise<Comment | null> {
  const row = await getPrisma().comment.findUnique({ where: { id } });
  return row ? mapToComment(row) : null;
}

/** 一次查询同时拿到「评论归属」与「文章作者」，删除鉴权与计数递减不再各打一次库。 */
export async function findCommentForDelete(id: string): Promise<{
  id: string;
  postId: string;
  userId: string;
  postAuthorId: string | null;
} | null> {
  const row = await getPrisma().comment.findUnique({
    where: { id },
    select: {
      id: true,
      postId: true,
      userId: true,
      post: { select: { authorId: true } },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    postId: row.postId,
    userId: row.userId,
    postAuthorId: row.post.authorId,
  };
}

export async function updateCommentRecord(
  id: string,
  data: { content: string; updatedAt: string },
): Promise<Comment | null> {
  try {
    const updated = await getPrisma().comment.update({
      where: { id },
      data: { content: data.content, updatedAt: new Date(data.updatedAt) },
    });
    return mapToComment(updated);
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err && err.code === "P2025") return null;
    throw err;
  }
}

export async function updateCommentsAuthor(
  userId: string,
  userName: string,
  userAvatar: string | null,
): Promise<number> {
  const result = await getPrisma().comment.updateMany({
    where: { userId },
    data: { userName, userAvatar },
  });
  return result.count;
}
