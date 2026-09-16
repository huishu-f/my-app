/**
 * @file 博客模块共享类型
 * @description 博客模块共享类型，涵盖文章实体、站点配置、列表查询参数、创建/更新 DTO 以及各类 API 响应数据结构，供前后端共用
 */
import type { AuthPayload } from './user';

/**
 * 博客文章
 * @description 文章完整实体，含内容元信息、作者信息与互动统计；contentRaw 仅详情接口返回
 */
export interface Post {
  /** 文章唯一ID */
  id: string;
  /** 文章标题 */
  title: string;
  /** 文章摘要，用于列表展示与 SEO */
  summary: string;
  /** 文章正文内容，列表场景为 excerpt（截断），详情场景为渲染后内容 */
  content: string;
  /** 文章正文原始 Markdown（仅详情接口返回，供编辑器预填，列表接口不下发） */
  contentRaw?: string;
  /** 文章分类 */
  category: string;
  /** 文章标签列表 */
  tags: string[];
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 发布时间（草稿未发布时为空） */
  publishedAt?: string;
  /** 是否为草稿 */
  isDraft: boolean;
  /** 是否置顶（置顶文章在列表中排最前） */
  pinned?: boolean;
  /** 封面图片地址 */
  coverImage?: string;
  /** 作者用户ID */
  authorId?: string;
  /** 作者显示名（冗余字段，避免列表展示时逐篇查询用户表） */
  authorName?: string;
  /** 阅读量 */
  views: number;
  /** 点赞数 */
  likes: number;
  /** 收藏数 */
  favorites?: number;
  /** 评论数 */
  commentsCount: number;
}

/**
 * 站点配置
 * @description 博客站点级配置项，可由管理员通过 /api/config 读取与修改
 */
export interface SiteConfig {
  /** 博客名称 */
  blogName: string;
  /** 站长/作者显示名 */
  author: string;
}

/**
 * 文章列表查询参数
 * @description GET /api/posts 的 URL 查询参数，字段均为可选
 */
export interface PostListParams {
  /** 草稿模式，传 'true' 时仅返回当前用户的草稿 */
  draft?: 'true';
  /** 分类筛选 */
  category?: string;
  /** 标签筛选 */
  tag?: string;
  /** 关键词搜索（匹配标题与正文） */
  q?: string;
  /** 页码，从 1 开始 */
  page?: number;
  /** 每页条数 */
  limit?: number;
}

/**
 * 创建文章请求体
 * @description POST /api/posts 的请求体 DTO
 */
export interface CreatePostDto {
  /** 文章标题 */
  title: string;
  /** 文章摘要 */
  summary?: string;
  /** 文章正文内容（Markdown） */
  content: string;
  /** 文章分类 */
  category: string;
  /** 文章标签，兼容字符串（逗号分隔）与字符串数组两种格式 */
  tags?: string | string[];
  /** 是否保存为草稿 */
  isDraft: boolean;
  /** 是否置顶 */
  pinned?: boolean;
  /** 封面图片地址 */
  coverImage?: string;
}

/**
 * 更新文章请求体
 * @description PUT /api/posts/:id 的请求体 DTO，CreatePostDto 的全字段 Partial 版本，仅更新传入字段
 */
export type UpdatePostDto = Partial<CreatePostDto>;

/**
 * 更新文章 mutation 参数
 * @description 前端 hooks 层 useUpdatePost 的变量：目标文章 ID + 更新内容
 */
export interface UpdatePostMutationVars {
  /** 待更新的文章ID */
  id: string;
  /** 更新文章请求体 */
  dto: UpdatePostDto;
}

/**
 * 文章列表响应数据
 * @description GET /api/posts 响应的 data 部分，含分页信息
 */
export interface PostsListData {
  /** 当前页文章列表 */
  posts: Post[];
  /** 符合条件的总条数 */
  total: number;
  /** 当前页码，从 1 开始 */
  page: number;
  /** 每页条数 */
  limit: number;
  /** 总页数 */
  totalPages: number;
}

/**
 * 文章详情响应数据
 * @description GET /api/posts/:id 响应的 data 部分
 */
export interface PostData {
  /** 文章详情 */
  post: Post;
}

/**
 * 点赞响应数据
 * @description POST /api/posts/:id/like 响应的 data 部分（切换点赞开关）
 */
export interface LikeData {
  /** 当前用户是否已点赞 */
  liked: boolean;
  /** 文章总点赞数 */
  likes: number;
}

/**
 * 收藏切换响应数据
 * @description POST /api/posts/:id/favorite 响应的 data 部分（切换收藏开关） */
export interface FavoriteToggleData {
  /** 当前用户是否已收藏 */
  favorited: boolean;
  /** 文章总收藏数 */
  favorites: number;
}

/**
 * 收藏列表响应数据
 * @description GET /api/favorites 响应的 data 部分，返回当前用户收藏的全部文章
 */
export interface FavoritesData {
  /** 收藏的文章列表 */
  posts: Post[];
}

/**
 * 分类列表响应数据
 * @description GET /api/categories 响应的 data 部分
 */
export interface CategoriesData {
  /** 全部分类名称列表 */
  categories: string[];
}

/**
 * 标签列表响应数据
 * @description GET /api/tags 响应的 data 部分
 */
export interface TagsData {
  /** 标签列表，每项含标签名与文章数量 */
  tags: { name: string; count: number }[];
}

/**
 * 站点配置响应数据
 * @description GET/PUT /api/config 响应的 data 部分 */
export interface ConfigData {
  /** 站点配置 */
  config: SiteConfig;
}

/**
 * 相邻文章响应数据
 * @description GET /api/posts/:id/neighbors 响应的 data 部分
 */
export interface NeighborPostsData {
  /** 上一篇（列表中较新的文章），无则为 null */
  prev: Post | null;
  /** 下一篇（列表中较旧的文章），无则为 null */
  next: Post | null;
}

/**
 * 博客数据库对象
 * @description 博客模块持久化的完整数据结构（文章、分类、站点配置的文件/存储总视图）
 */
export interface BlogDB {
  /** 全部文章列表 */
  posts: Post[];
  /** 全部分类列表 */
  categories: string[];
  /** 站点配置 */
  siteConfig: SiteConfig;
}

/**
 * 更新站点配置 DTO
 * @description PUT /api/config 的请求体，字段可选
 */
export interface UpdateSiteConfigDto {
  /** 博客名称 */
  blogName?: string;
  /** 作者名称 */
  author?: string;
}

/**
 * 文章列表查询选项（后端内部使用）
 * @description 后端 listPosts 的内部参数；`user` 由鉴权中间件注入，前端不传
 */
export interface ListPostsOptions {
  /** 是否草稿模式（仅返回当前用户草稿） */
  draft?: boolean;
  /** 分类筛选 */
  category?: string;
  /** 标签筛选 */
  tag?: string;
  /** 关键词搜索（匹配标题与正文） */
  q?: string;
  /** 页码，从 1 开始 */
  page?: number;
  /** 每页条数 */
  limit?: number;
  /** 认证上下文（后端鉴权中间件注入，用于草稿归属过滤） */
  user?: AuthPayload;
}
