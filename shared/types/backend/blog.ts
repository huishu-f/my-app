/**
 * @file 博客模块后端接口契约
 * @description 定义博客域的后端分层契约：文章 CRUD、点赞收藏、分类标签、站点配置与相邻文章等业务服务，以及数据仓储（含乐观锁更新）
 */

import type {
  Post,
  SiteConfig,
  BlogDB,
  CreatePostDto,
  UpdatePostDto,
  UpdateSiteConfigDto,
  ListPostsOptions,
  PostsListData,
} from '../blog';

/**
 * 博客业务服务接口
 * @description 博客域核心业务层契约，供各后端适配实现 */
export interface BlogService {
  /**
   * 获取文章分页列表
   * @param options 查询选项（草稿/分类/标签/关键词/分页 + 认证上下文）
   * @returns 文章列表与分页信息
   */
  listPosts(options: ListPostsOptions): Promise<PostsListData>;
  /**
   * 获取文章详情
   * @description 文草稿仅作者本人可读
   * @param id 文章ID
   * @param user 认证上下文（含用户ID），可选
   * @returns 文章实体
   * @throws 文章不存在或无权查看时抛出错误
   */
  getPost(id: string, user?: { id: string }): Promise<Post>;
  /**
   * 记录一次文章浏览
   * @description 仅对已发布文章计数，客户端上报接口专用（不用于服务端渲染）
   * @param id 文章ID
   */
  incrementView(id: string): Promise<void>;
  /**
   * 创建文章
   * @param dto 文章内容（附加 authorId 标识作者）
   * @returns 创建后的文章实体
   */
  createPost(dto: CreatePostDto & { authorId: string }): Promise<Post>;
  /**
   * 更新文章
   * @param id 文章ID
   * @param dto 更新内容
   * @param currentUserId 当前操作用户ID（校验作者权限）
   * @returns 更新后的文章实体
   * @throws 非作者操作时抛出权限错误
   */
  updatePost(id: string, dto: UpdatePostDto, currentUserId: string): Promise<Post>;
  /**
   * 删除文章
   * @param id 文章ID
   * @param currentUserId 当前操作用户ID（校验作者权限）
   * @throws 非作者操作时抛出权限错误
   */
  deletePost(id: string, currentUserId: string): Promise<void>;
  /**
   * 点赞/取消点赞文章（开关切换）
   * @param id 文章ID
   * @param currentUserId 当前用户ID
   * @returns 切换后是否已点赞与总点赞数
   */
  likePost(id: string, currentUserId: string): Promise<{ liked: boolean; likes: number }>;
  /**
   * 收藏/取消收藏文章（开关切换）
   * @param id 文章ID
   * @param currentUserId 当前用户ID
   * @returns 切换后是否已收藏与总收藏数
   */
  toggleFavorite(
    id: string,
    currentUserId: string,
  ): Promise<{ favorited: boolean; favorites: number }>;
  /**
   * 获取当前用户的收藏文章列表
   * @param currentUserId 当前用户ID
   * @returns 收藏的文章列表
   */
  listFavoritePosts(currentUserId: string): Promise<Post[]>;
  /**
   * 获取全部分类
   * @returns 分类名称列表
   */
  getCategories(): Promise<string[]>;
  /**
   * 获取全部标签
   * @returns 标签列表，每项含标签名与文章数量
   */
  getTags(): Promise<{ name: string; count: number }[]>;
  /**
   * 获取站点配置
   * @returns 站点配置
   */
  getConfig(): Promise<SiteConfig>;
  /**
   * 更新站点配置
   * @param dto 待更新的配置字段
   * @param userId 操作用户ID（校验管理员权限）
   * @returns 更新后的站点配置
   * @throws 非管理员操作时抛出权限错误
   */
  updateConfig(dto: UpdateSiteConfigDto, userId: string): Promise<SiteConfig>;
  /**
   * 获取相邻文章
   * @param id 当前文章ID
   * @returns 上一篇（较新）与下一篇（较旧），不存在时为 null
   */
  getNeighborPosts(id: string): Promise<{ prev: Post | null; next: Post | null }>;
}

/**
 * 博客数据仓储接口
 * @description 博客持久化层契约；updateWithRetry 提供乐观锁原子更新 */
export interface BlogRepository {
  /**
   * 读取完整数据库
   * @returns 博客全量数据（文章、分类、配置）
   */
  read(): Promise<BlogDB>;
  /**
   * 写入完整数据库
   * @param db 待写入的全量数据
   */
  write(db: BlogDB): Promise<void>;
  /**
   * 带乐观锁重试的原子更新
   * @description 以 read-modify-write 循环执行 mutate，检测到并发写入冲突时自动重试
   * @param mutate 对数据库的变更函数（应为纯函数，可被重放）
   * @returns mutate 的返回值
   */
  updateWithRetry<R>(mutate: (db: BlogDB) => R): Promise<R>;
  /**
   * 文章阅读量自增
   * @param postId 文章ID
   */
  incrementView(postId: string): Promise<void>;
  /**
   * 更新文章评论数
   * @param postId 文章ID
   * @param delta 增量，1 新增评论 / -1 删除评论
   */
  updateCommentsCount(postId: string, delta: 1 | -1): Promise<void>;
}
