import type { AuthPayload } from "./user";

export interface Post {
  id: string;

  title: string;

  summary: string;

  content: string;

  contentRaw?: string;

  category: string;

  tags: string[];

  createdAt: string;

  updatedAt: string;

  publishedAt?: string;

  isDraft: boolean;

  pinned?: boolean;

  coverImage?: string;

  authorId?: string;

  authorName?: string;

  views: number;

  likes: number;

  favorites?: number;

  commentsCount: number;
}

export interface PostListParams {
  draft?: "true";

  category?: string;

  tag?: string;

  q?: string;

  page?: number;

  limit?: number;
}

export interface CreatePostDto {
  title: string;

  summary?: string;

  content: string;

  category: string;

  tags?: string | string[];

  isDraft: boolean;

  pinned?: boolean;

  coverImage?: string;
}

export type UpdatePostDto = Partial<CreatePostDto>;

export interface UpdatePostMutationVars {
  id: string;

  dto: UpdatePostDto;
}

export interface PostsListData {
  posts: Post[];

  total: number;

  page: number;

  limit: number;

  totalPages: number;
}

export interface PostData {
  post: Post;
}

export interface LikeData {
  liked: boolean;

  likes: number;
}

export interface FavoriteToggleData {
  favorited: boolean;

  favorites: number;
}

export interface CategoriesData {
  categories: string[];
}

export interface TagsData {
  tags: { name: string; count: number }[];
}

export interface NeighborPostsData {
  prev: Post | null;

  next: Post | null;
}

export interface ListPostsOptions {
  draft?: boolean;

  category?: string;

  tag?: string;

  q?: string;

  page?: number;

  limit?: number;

  internal?: boolean;

  user?: AuthPayload;
}
