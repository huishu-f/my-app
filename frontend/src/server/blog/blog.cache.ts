import "server-only";

import { cache } from "react";
import { unstable_cache, revalidateTag } from "next/cache";

import type {
  CategoriesData,
  NeighborPostsData,
  PostData,
  PostListParams,
  PostsListData,
  TagsData,
} from "@my-app/shared";
import type { Post } from "@my-app/shared";
import {
  listPosts,
  getPost,
  listFavoritePosts,
  listPostsByAuthor,
  getNeighborPosts,
} from "./blog.service";
import { getCategoriesFromDb, getTagsFromDb } from "./blog.repository";
import { getAuthPayload } from "@server/auth/auth.service";

const BLOG_TAGS = ["posts", "categories", "tags"] as const;

export function invalidateBlogCache(postId?: string): void {
  for (const tag of BLOG_TAGS) {
    revalidateTag(tag, { expire: 0 });
  }
  if (postId) {
    revalidateTag(`post:${postId}`, { expire: 0 });
  }
}

/**
 * 单篇文章级失效：列表数据（"posts" tag，卡片上的计数会变）+ 该篇详情
 * （"post:${id}" tag），不动 taxonomy、不动其它文章的详情缓存。
 * 点赞/收藏/评论走这里；文章增删改仍走 invalidateBlogCache（taxonomy 会变）。
 */
export function invalidatePostCache(postId: string): void {
  revalidateTag("posts", { expire: 0 });
  revalidateTag(`post:${postId}`, { expire: 0 });
}

const POSTS_REVALIDATE = 300;
const TAXONOMY_REVALIDATE = 3600;

function normalizeListParams(params: PostListParams) {
  return {
    draft: params.draft === "true",
    category: params.category,
    tag: params.tag,
    q: params.q,
    page: params.page,
    limit: params.limit,
  };
}

async function listPostsInternal(params: PostListParams): Promise<PostsListData> {
  const user = await getAuthPayload();
  return listPosts({
    ...normalizeListParams(params),
    user: user ?? undefined,
    internal: true,
  });
}

const listPostsCached = unstable_cache(
  async (params: PostListParams): Promise<PostsListData> => {
    return listPosts({
      ...normalizeListParams(params),
      internal: true,
    });
  },
  ["blog", "list-posts"],
  { tags: ["posts"], revalidate: POSTS_REVALIDATE },
);

export async function listPostsServer(
  params: PostListParams = {},
  withAuth = false,
): Promise<PostsListData> {
  return withAuth ? listPostsInternal(params) : listPostsCached(params);
}

export async function getPostServer(id: string): Promise<PostData> {
  const user = await getAuthPayload();
  const post = await getPost(id, user ?? undefined);
  return { post };
}

/**
 * ponytail: 详情缓存的 tag 必须按 id 动态注册 —— unstable_cache 的 options
 * 在创建时求值，所以每个 id 包一层新的 unstable_cache（外层 React cache
 * 保证同一请求内同 id 只创建一次）。此前详情缓存只挂粗粒度 "posts" tag，
 * 任何一篇的点赞/评论都会把全站所有文章的详情缓存一起打掉。
 */
export const getPublicPostServer = cache((id: string) =>
  unstable_cache(
    async (): Promise<PostData> => {
      const post = await getPost(id);
      return { post };
    },
    ["blog", "public-post", id],
    { tags: [`post:${id}`], revalidate: POSTS_REVALIDATE },
  )(),
);

export const getNeighborPostsServer = unstable_cache(
  async (id: string): Promise<NeighborPostsData> => getNeighborPosts(id),
  ["blog", "neighbor-posts"],
  { tags: ["posts"], revalidate: POSTS_REVALIDATE },
);

export const getCategoriesServer = unstable_cache(
  async (): Promise<CategoriesData> => ({ categories: await getCategoriesFromDb() }),
  ["blog", "categories"],
  { tags: ["categories"], revalidate: TAXONOMY_REVALIDATE },
);

export const getTagsServer = unstable_cache(
  async (): Promise<TagsData> => ({ tags: await getTagsFromDb() }),
  ["blog", "tags"],
  { tags: ["tags"], revalidate: TAXONOMY_REVALIDATE },
);

export async function listFavoritePostsServer(): Promise<PostsListData> {
  const user = await getAuthPayload();
  if (!user) return { posts: [], total: 0, page: 1, limit: 0, totalPages: 0 };
  const posts = await listFavoritePosts(user.id);
  return { posts, total: posts.length, page: 1, limit: posts.length, totalPages: 1 };
}

export async function listDraftsServer(): Promise<PostsListData> {
  return listPostsInternal({ draft: "true" });
}

export async function listPostsByAuthorServer(authorId: string): Promise<Post[]> {
  return listPostsByAuthor(authorId);
}

export { findRenamedPostId } from "./blog.service";
