/**
 * @file blog.service.ts
 * @description blog 模块核心业务服务工厂：文章 CRUD（含草稿切换）、浏览/点赞/收藏、
 *              分类与标签查询、站点配置管理、相邻文章查询，
 *              并同步作者统计与用户点赞/收藏记录。仅限服务端（server-only）。
 */

import { randomUUID } from 'node:crypto';
import 'server-only';

import type { Post, User, SiteConfig, BlogService } from '@my-app/shared';
import {
  NotFoundError,
  UnprocessableEntityError,
  ValidationError,
  ForbiddenError,
} from '@server/errors';
import { logger } from '@server/utils/logger';
import type { BlogRepository } from '@server/modules/blog/kv-blog.repository';
import type { UserRepository } from '@server/modules/auth/kv-user.repository';
import type { CommentRepository } from '@server/modules/comment/kv-comment.repository';
import type {
  CreatePostDto,
  ListPostsOptions,
  PostsListData,
  UpdatePostDto,
  UpdateSiteConfigDto,
} from '@my-app/shared';
import { generateSummary } from './summary.service';
import { renderMarkdown } from './markdown.service';

/**
 * 防御性数字转换 — 防止 JSON 中存储的字符串/null 导致字符串拼接
 * @param val 原始值
 * @returns 有效数字返回该数字，否则返回 0
 */
function toNum(val: unknown): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  return 0;
}

export type { BlogService };

/**
 * 生成 URL / 文件友好的 slug
 * @description 小写化、NFD 分解去变音符号、非字母数字（含汉字）替换为连字符、
 *              去首尾连字符，最长截取 30 字符
 * @param title 文章标题
 * @returns 规范化后的 slug；标题无有效字符时返回空串
 * @example
 * slug('Hello, 世界!') // 'hello-世界'
 */
export function slug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

/**
 * 生成文章 ID
 * @param title 文章标题，用于生成 slug 部分，slug 为空时回退 'post'
 * @returns `${时间戳}-${slug}-${uuid前8位}` 格式的唯一 ID
 * @example
 * generatePostId('我的新文章') // '1726500000000-我的新文章-a1b2c3d4'
 */
export function generatePostId(title: string): string {
  const titleSlug = slug(title);
  const slugPart = titleSlug || 'post';
  // ponytail: randomUUID 截取前 8 字符作为后缀（碰撞概率 ~1/4M），全量 UUID 可换 randomUUID() 但 ID 过长影响 URL 可读性。
  return `${Date.now()}-${slugPart}-${randomUUID().slice(0, 8)}`;
}

/**
 * 解析并规范化标签
 * @description 支持逗号分隔字符串或字符串数组输入；逐项 trim + toLowerCase，
 *              过滤空串、去重，最多保留 20 个
 * @param input 原始标签输入，undefined/null 返回空数组
 * @returns 规范化后的标签数组（最多 20 个）
 * @example
 * parseTags('React, TypeScript, react') // ['react', 'typescript']
 */
export function parseTags(input: string | string[] | undefined): string[] {
  if (input === undefined || input === null) return [];

  const rawArray = Array.isArray(input) ? input : input.split(',');
  const tags = [
    ...new Set(rawArray.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0)),
  ].slice(0, 20);

  return tags;
}

/**
 * 校验封面图 URL — 拦截内网/元数据地址，防止 SSRF
 * @description 空/未传直接放行；必须为 http(s) URL；host 命中 localhost、回环、
 *              私有网段、链路本地、IPv6 本地/ULA 等内网特征则拒绝
 * @param value 封面图 URL
 * @throws 非 http(s) URL、指向内网地址或格式无法解析时抛出 UnprocessableEntityError
 */
export function validateCoverImage(value: string | undefined): void {
  if (value === undefined || value === '') return;
  if (!/^https?:\/\//i.test(value)) {
    throw new UnprocessableEntityError('coverImage 必须是 http(s) URL');
  }
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase();
    // 拦截内网与元数据地址
    const isInternal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^f[cd][0-9a-f]{2}:/.test(host) ||
      host.startsWith('fe80:');
    if (isInternal) {
      throw new UnprocessableEntityError('coverImage 不允许指向内网地址');
    }
  } catch (e) {
    if (e instanceof UnprocessableEntityError) throw e;
    throw new UnprocessableEntityError('coverImage URL 格式无效');
  }
}

/**
 * 计算孤立分类清理后的分类数组
 * @description 遍历全部文章，收集非草稿且带分类的文章的分类名（trim 后去重），
 *              草稿文章的分类不计入，从而清理无文章引用的分类
 * @param posts 全部文章列表
 * @returns 已发布文章中去重后的分类数组（Set 插入序）
 */
export function cleanupCategories(posts: Post[]): string[] {
  const used = new Set<string>();
  for (const post of posts) {
    if (!post.isDraft && post.category) {
      used.add(post.category.trim());
    }
  }
  return Array.from(used);
}

/**
 * 规范化文本：去除首尾空白后校验非空
 * @param value 原始文本
 * @param field 字段名称，用于拼装错误提示
 * @returns 去空白后的文本
 * @throws 空白字符串时抛出 ValidationError
 */
function normalizeText(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ValidationError(`${field} 不能为空`);
  }
  return trimmed;
}

/**
 * 断言当前用户为文章所有者
 * @param post 文章对象
 * @param currentUserId 当前用户 ID
 * @throws 文章无作者信息或当前用户非作者时抛出 ForbiddenError
 */
function assertPostOwner(post: Post, currentUserId: string): void {
  // 缺少 authorId 的文章无法校验所有权，禁止任何用户操作
  if (!post.authorId) {
    throw new ForbiddenError('该文章无作者信息，无法操作');
  }
  if (post.authorId !== currentUserId) {
    throw new ForbiddenError('无权操作该文章');
  }
}

/**
 * 创建 blog 服务
 * @param deps 依赖对象，包含 repo（博客仓储）、userRepo（用户仓储）、commentRepo（评论仓储）
 * @returns 实现 BlogService 的服务对象
 */
export function createBlogService(deps: {
  repo: BlogRepository;
  userRepo: UserRepository;
  commentRepo: CommentRepository;
}): BlogService {
  /**
   * 获取文章列表
   * @description 支持草稿模式（需登录，仅返回本人草稿）、分类/标签/关键词筛选，
   *              排序后按 page/limit 分页（limit 夹在 1-100）
   * @param options 列表查询选项（draft/category/tag/q/page/limit/user）
   * @returns 分页数据：posts 当前页文章、total 总数、totalPages 总页数
   */
  async function listPosts(options: ListPostsOptions): Promise<PostsListData> {
    const db = await deps.repo.read();
    let posts = db.posts;

    const isDraftMode = options.draft === true;
    const hasUser = !!options.user;

    if (isDraftMode) {
      if (!hasUser) {
        return {
          posts: [],
          total: 0,
          page: options.page ?? 1,
          limit: options.limit ?? 10,
          totalPages: 0,
        };
      }
      // 草稿模式仅返回当前用户的草稿，避免跨用户泄漏
      posts = posts.filter((p) => p.isDraft && p.authorId === options.user!.id);
    } else {
      posts = posts.filter((p) => !p.isDraft);
    }

    const category = options.category?.trim();
    if (category) {
      posts = posts.filter((p) => p.category === category);
    }

    const tag = options.tag?.trim();
    if (tag) {
      posts = posts.filter((p) => p.tags.includes(tag));
    }

    const q = options.q?.trim().toLowerCase();
    if (q) {
      posts = posts.filter(
        (p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q),
      );
    }

    const sorted = sortPosts(posts, isDraftMode);
    const total = sorted.length;
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 10));
    const start = (page - 1) * limit;
    const paged = sorted.slice(start, start + limit);

    return { posts: paged, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * 文章排序（原地排序）
   * @param posts 待排序文章数组
   * @param isDraftMode 是否为草稿模式
   * @returns 排序后的同一数组：草稿按 updatedAt 倒序；已发布按置顶优先 + 发布时间（缺省 createdAt）倒序
   */
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

  /**
   * 获取文章详情（纯读路径，无副作用）
   * @description 浏览计数已抽离至 incrementView（由客户端上报接口触发），
   *              使 getPost 可安全进入 Data Cache；草稿仅作者可见，其余情况一律 404；
   *              返回的 content 为渲染后的安全 HTML，contentRaw 保留原始 Markdown 供编辑器预填
   * @param id 文章 ID
   * @param user 当前用户（可选，用于判断草稿访问权限）
   * @returns 文章对象（content 已渲染为 HTML，另含 contentRaw）
   * @throws 文章不存在或无权访问草稿时抛出 NotFoundError
   */
  async function getPost(id: string, user?: { id: string }): Promise<Post> {
    const db = await deps.repo.read();
    const post = db.posts.find((p) => p.id === id);
    if (!post) {
      throw new NotFoundError('文章不存在');
    }
    if (post.isDraft) {
      // 草稿仅作者可见：访客和无身份 Cookie 的用户 → 404；非作者登录用户 → 404
      if (!user || user.id !== post.authorId) {
        throw new NotFoundError('文章不存在');
      }
    }

    // 将原始 Markdown 渲染为安全的 HTML，防止 XSS
    // contentRaw 保留原始 Markdown，供编辑器预填（详情页渲染仍用 content）
    const renderedPost: Post = {
      ...post,
      content: renderMarkdown(post.content),
      contentRaw: post.content,
    };

    return renderedPost;
  }

  /**
   * 记录一次文章浏览（仅已发布文章计数）
   * @description 与 getPost 读路径解耦：详情页可静态缓存，计数由真实访问触发；
   *              文章/浏览计数与作者 stats.views 均为异步写入（fire-and-forget），失败仅记日志不抛错
   * @param id 文章 ID，草稿或不存在时静默忽略
   */
  async function incrementView(id: string): Promise<void> {
    const db = await deps.repo.read();
    const post = db.posts.find((p) => p.id === id);
    // 仅已发布文章计数；草稿/不存在静默忽略（客户端 fire-and-forget，无需报错）
    if (!post || post.isDraft) return;

    // 使用 repo.incrementView 原子递增，避免 read-modify-write 竞态
    deps.repo.incrementView(post.id).catch((err) => {
      logger.error('浏览量写入失败', {
        postId: post.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    // 同步更新作者的 stats.views（非关键统计，失败仅记录）
    if (post.authorId) {
      deps.userRepo
        .findById(post.authorId)
        .then((author) => {
          if (author) {
            const stats = { ...author.stats, views: toNum(author.stats?.views) + 1 };
            deps.userRepo.update(post.authorId!, { stats }).catch((err) => {
              logger.error('作者浏览量统计更新失败', {
                authorId: post.authorId,
                error: err instanceof Error ? err.message : String(err),
              });
            });
          }
        })
        .catch((err) => {
          logger.error('查找作者失败', {
            authorId: post.authorId,
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }
  }

  /**
   * 创建文章
   * @description 校验标题/正文/分类非空与封面图安全后创建；摘要缺省时自动生成；
   *              草稿强制不置顶；已发布文章记录 publishedAt、刷新分类列表并递增作者 articles 统计
   * @param dto 创建文章参数，含 authorId
   * @returns 创建成功的文章对象
   * @throws 标题/正文/分类为空抛 ValidationError；封面图不合法抛 UnprocessableEntityError；作者不存在抛 NotFoundError
   */
  async function createPost(dto: CreatePostDto & { authorId: string }): Promise<Post> {
    const title = normalizeText(dto.title, '标题');
    const content = normalizeText(dto.content, '正文');
    const category = normalizeText(dto.category, '分类');
    validateCoverImage(dto.coverImage);

    const author = await deps.userRepo.findById(dto.authorId);
    if (!author) {
      throw new NotFoundError('作者不存在');
    }

    const now = new Date().toISOString();
    const tags = parseTags(dto.tags);
    const summary = dto.summary?.trim() || generateSummary(content);
    const isDraft = Boolean(dto.isDraft);

    const post: Post = {
      id: generatePostId(title),
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

    // 已发布文章记录 publishedAt
    if (!isDraft) {
      post.publishedAt = now;
    }

    await deps.repo.updateWithRetry((db) => {
      db.posts.push(post);

      // 已发布文章需要更新分类列表
      if (!isDraft) {
        db.categories = cleanupCategories(db.posts);
      }
    });

    // 更新作者的文章统计（仅发布文章计入，草稿不计）
    if (!isDraft) {
      const authorStats = { ...author.stats, articles: toNum(author.stats?.articles) + 1 };
      await deps.userRepo.update(dto.authorId, { stats: authorStats });
    }

    return post;
  }

  /**
   * 更新文章（支持草稿 <-> 发布状态切换）
   * @description 在 updateWithRetry 中完成查找、所有权断言、字段合并与分类刷新；
   *              草稿转发布记 publishedAt（作者 articles +1），发布转草稿清 publishedAt（articles -1）；
   *              摘要规则：显式传 summary 用其 trim 值，否则正文变更时重新生成，否则保持原值
   * @param id 文章 ID
   * @param dto 更新参数，字段均可选
   * @param currentUserId 当前用户 ID，用于权限校验
   * @returns 更新后的文章对象
   * @throws 文章不存在抛 NotFoundError；无权操作抛 ForbiddenError；字段校验失败抛相应错误
   */
  async function updatePost(id: string, dto: UpdatePostDto, currentUserId: string): Promise<Post> {
    let prevIsDraft = false;
    let prevAuthorId: string | undefined;

    const updated = await deps.repo.updateWithRetry<Post>((db) => {
      const index = db.posts.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new NotFoundError('文章不存在');
      }

      const existing = db.posts[index];
      assertPostOwner(existing, currentUserId);

      const title = dto.title !== undefined ? normalizeText(dto.title, '标题') : existing.title;
      const content =
        dto.content !== undefined ? normalizeText(dto.content, '正文') : existing.content;
      const category =
        dto.category !== undefined ? normalizeText(dto.category, '分类') : existing.category;

      if (dto.coverImage !== undefined) {
        validateCoverImage(dto.coverImage);
      }

      const isDraft = dto.isDraft !== undefined ? Boolean(dto.isDraft) : existing.isDraft;
      const wasDraft = existing.isDraft;
      prevIsDraft = wasDraft;
      prevAuthorId = existing.authorId;

      let summary = existing.summary;
      if (dto.summary !== undefined) {
        summary = dto.summary.trim();
      } else if (dto.content !== undefined) {
        summary = generateSummary(content);
      }

      const now = new Date().toISOString();

      const updatedPost: Post = {
        ...existing,
        title,
        content,
        category,
        summary,
        tags: dto.tags !== undefined ? parseTags(dto.tags) : existing.tags,
        isDraft,
        pinned: isDraft ? false : dto.pinned !== undefined ? Boolean(dto.pinned) : existing.pinned,
        coverImage:
          dto.coverImage !== undefined ? dto.coverImage.trim() || undefined : existing.coverImage,
        updatedAt: now,
      };

      // 草稿转发布：记录 publishedAt
      if (wasDraft && !isDraft) {
        updatedPost.publishedAt = now;
      }

      // 发布转草稿：清除 publishedAt
      if (!wasDraft && isDraft) {
        updatedPost.publishedAt = undefined;
      }

      db.posts[index] = updatedPost;
      db.categories = cleanupCategories(db.posts);
      return updatedPost;
    });

    // 同步作者 stats：草稿↔已发布状态变更时调整文章计数
    if (prevIsDraft && !updated.isDraft) {
      // 草稿转发布：articles +1
      if (prevAuthorId) {
        const author = await deps.userRepo.findById(prevAuthorId);
        if (author) {
          const stats = { ...author.stats, articles: toNum(author.stats?.articles) + 1 };
          await deps.userRepo.update(prevAuthorId, { stats });
        }
      }
    } else if (!prevIsDraft && updated.isDraft) {
      // 发布转草稿：articles -1
      if (prevAuthorId) {
        const author = await deps.userRepo.findById(prevAuthorId);
        if (author) {
          const articles = Math.max(0, toNum(author.stats?.articles) - 1);
          await deps.userRepo.update(prevAuthorId, { stats: { ...author.stats, articles } });
        }
      }
    }

    return updated;
  }

  /**
   * 删除文章
   * @description 删除后级联删除该文章评论、清理所有用户点赞/收藏记录中的该文章 ID、
   *              已发布文章递减作者 articles 统计；后续清理均为尽力而为，失败仅记日志不影响删除结果
   * @param id 文章 ID
   * @param currentUserId 当前用户 ID，用于权限校验
   * @throws 文章不存在抛 NotFoundError；无权操作抛 ForbiddenError
   */
  async function deletePost(id: string, currentUserId: string): Promise<void> {
    const post = await deps.repo.updateWithRetry<Post>((db) => {
      const index = db.posts.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new NotFoundError('文章不存在');
      }
      const target = db.posts[index];
      assertPostOwner(target, currentUserId);

      // 删除文章本身，更新分类列表
      db.posts.splice(index, 1);
      db.categories = cleanupCategories(db.posts);
      return target;
    });

    // 文章删除成功后，级联删除评论（失败仅记录日志，不影响文章删除结果）
    try {
      await deps.commentRepo.deleteByPostId(id);
    } catch (err) {
      logger.error('级联删除评论失败', {
        postId: id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // 清理所有用户 likedArticles / favoritedArticles 中的该文章 ID
    // ponytail: O(n) 全量用户扫描清理点赞/收藏，用户量增大后应维护反向索引 post:likers 或读取时惰性过滤。
    try {
      const allUsers = await deps.userRepo.findAll();
      for (const user of allUsers) {
        const likedArticles = user.likedArticles ?? [];
        const favoritedArticles = user.favoritedArticles ?? [];
        const newLiked = likedArticles.filter((aid) => aid !== id);
        const newFavorited = favoritedArticles.filter((aid) => aid !== id);
        if (
          newLiked.length !== likedArticles.length ||
          newFavorited.length !== favoritedArticles.length
        ) {
          await deps.userRepo.update(user.id, {
            likedArticles: newLiked,
            favoritedArticles: newFavorited,
          });
        }
      }
    } catch (err) {
      logger.error('清理用户点赞/收藏记录失败', {
        postId: id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // 更新作者的 stats.articles（仅已发布文章才需要减）
    if (!post.isDraft && post.authorId) {
      try {
        const author = await deps.userRepo.findById(post.authorId);
        if (author) {
          const articles = Math.max(0, toNum(author.stats?.articles) - 1);
          await deps.userRepo.update(post.authorId, { stats: { ...author.stats, articles } });
        }
      } catch (err) {
        logger.error('更新作者文章统计失败', {
          authorId: post.authorId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /**
   * 点赞/取消点赞文章
   * @description 委托 toggleUserPostAssociation 完成用户与文章双向数据更新，
   *              随后同步文章作者的 stats.likes（失败仅记日志）
   * @param id 文章 ID
   * @param currentUserId 当前用户 ID
   * @returns 点赞状态（liked）与最新点赞总数（likes）
   * @throws 文章不存在抛 NotFoundError；草稿文章抛 ForbiddenError；用户不存在抛 NotFoundError
   */
  async function likePost(
    id: string,
    currentUserId: string,
  ): Promise<{ liked: boolean; likes: number }> {
    const result = await toggleUserPostAssociation(id, currentUserId, 'likedArticles', 'likes');
    // 更新文章作者的 stats.likes（非关键统计，失败仅记录）
    if (result.authorId) {
      try {
        const postAuthor = await deps.userRepo.findById(result.authorId);
        if (postAuthor) {
          const delta = result.wasPresent ? -1 : 1;
          const likes = Math.max(0, toNum(postAuthor.stats?.likes) + delta);
          await deps.userRepo.update(result.authorId, {
            stats: { ...postAuthor.stats, likes },
          });
        }
      } catch (err) {
        logger.error('更新作者 likes 统计失败', {
          authorId: result.authorId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return { liked: !result.wasPresent, likes: result.count };
  }

  /**
   * 收藏/取消收藏文章
   * @description 与点赞同构，委托 toggleUserPostAssociation，仅不维护作者统计
   * @param id 文章 ID
   * @param currentUserId 当前用户 ID
   * @returns 收藏状态（favorited）与最新收藏总数（favorites）
   * @throws 文章不存在抛 NotFoundError；草稿文章抛 ForbiddenError；用户不存在抛 NotFoundError
   */
  async function toggleFavorite(
    id: string,
    currentUserId: string,
  ): Promise<{ favorited: boolean; favorites: number }> {
    const result = await toggleUserPostAssociation(
      id,
      currentUserId,
      'favoritedArticles',
      'favorites',
    );
    return { favorited: !result.wasPresent, favorites: result.count };
  }

  /**
   * 点赞/收藏的共用 toggle 逻辑
   * @description 先写用户数据（userField 集合增删文章 ID），再在 updateWithRetry 中
   *              更新文章计数（postField）；文章更新失败时回滚用户数据，回滚失败仅记日志
   * @param id 文章 ID
   * @param currentUserId 当前用户 ID
   * @param userField 用户侧字段名：likedArticles 或 favoritedArticles
   * @param postField 文章侧计数字段名：likes 或 favorites
   * @returns wasPresent 该文章是否已在用户集合中（true 表示本次为取消操作）、
   *          count 更新后的文章计数、authorId 文章作者 ID（可能为 undefined）
   * @throws 用户不存在抛 NotFoundError；文章不存在/草稿抛出 blogging 阶段的原始异常（回滚后重抛）
   */
  async function toggleUserPostAssociation(
    id: string,
    currentUserId: string,
    userField: 'likedArticles' | 'favoritedArticles',
    postField: 'likes' | 'favorites',
  ): Promise<{ wasPresent: boolean; count: number; authorId?: string }> {
    const user = await deps.userRepo.findById(currentUserId);
    if (!user) throw new NotFoundError('用户不存在');

    const set = new Set(user[userField] ?? []);
    const wasPresent = set.has(id);
    const original = user[userField] ?? [];

    if (wasPresent) set.delete(id);
    else set.add(id);

    await deps.userRepo.update(currentUserId, { [userField]: Array.from(set) } as Partial<User>);

    let count = 0;
    let authorId: string | undefined;
    try {
      await deps.repo.updateWithRetry((db) => {
        const post = db.posts.find((p) => p.id === id);
        if (!post) throw new NotFoundError('文章不存在');
        if (post.isDraft) throw new ForbiddenError('草稿文章不可操作');
        post[postField] = wasPresent
          ? Math.max(0, (post[postField] ?? 0) - 1)
          : (post[postField] ?? 0) + 1;
        count = post[postField];
        authorId = post.authorId;
      });
    } catch (blogErr) {
      await deps.userRepo
        .update(currentUserId, { [userField]: original } as Partial<User>)
        .catch((rollbackErr) => {
          logger.error(`回滚 ${userField} 失败`, {
            userId: currentUserId,
            error: String(rollbackErr),
          });
        });
      throw blogErr;
    }

    return { wasPresent, count, authorId };
  }

  /**
   * 获取当前用户收藏的文章列表
   * @description 按用户的收藏顺序返回，仅含目前存在的已发布文章（草稿不进入收藏列表）
   * @param currentUserId 当前用户 ID
   * @returns 收藏文章数组，无收藏返回空数组
   * @throws 用户不存在时抛出 NotFoundError
   */
  async function listFavoritePosts(currentUserId: string): Promise<Post[]> {
    const user = await deps.userRepo.findById(currentUserId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }
    const favoritedIds = user.favoritedArticles ?? [];
    if (favoritedIds.length === 0) {
      return [];
    }
    const db = await deps.repo.read();
    // 按收藏顺序返回，仅含已发布文章（草稿不进入收藏列表）
    return favoritedIds
      .map((fid) => db.posts.find((p) => p.id === fid))
      .filter((p): p is Post => !!p && !p.isDraft);
  }

  /**
   * 获取所有分类
   * @returns 博客数据库中维护的分类名称数组
   */
  async function getCategories(): Promise<string[]> {
    const db = await deps.repo.read();
    return db.categories;
  }

  /**
   * 获取所有标签
   * @description 统计已发布文章中的标签（trim + toLowerCase 归一化）出现次数，按标签名字母序返回
   * @returns 标签列表，每项含标签名 name 与出现次数 count
   */
  async function getTags(): Promise<{ name: string; count: number }[]> {
    const db = await deps.repo.read();
    const tagMap = new Map<string, number>();
    for (const post of db.posts) {
      if (!post.isDraft) {
        for (const tag of post.tags) {
          const normalized = tag.trim().toLowerCase();
          if (normalized) {
            tagMap.set(normalized, (tagMap.get(normalized) ?? 0) + 1);
          }
        }
      }
    }
    return Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * 获取站点配置
   * @returns 站点配置对象（blogName、author）
   */
  async function getConfig(): Promise<SiteConfig> {
    const db = await deps.repo.read();
    return db.siteConfig;
  }

  /**
   * 更新站点配置
   * @description 仅 Admin 角色可修改；blogName/author 为空时回退默认值，
   *              兜底值与 KV 仓库默认配置、页脚展示一致
   * @param dto 站点配置参数（博客名称、作者名）
   * @param userId 操作用户 ID
   * @returns 更新后的站点配置
   * @throws 用户不存在抛 NotFoundError；非管理员抛 ForbiddenError
   */
  async function updateConfig(dto: UpdateSiteConfigDto, userId: string): Promise<SiteConfig> {
    // 校验请求用户确实存在（防止已删除用户操作）
    const user = await deps.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }
    // 仅管理员可修改站点配置
    if (user.role !== 'Admin') {
      throw new ForbiddenError('无权修改站点配置');
    }

    return deps.repo.updateWithRetry<SiteConfig>((db) => {
      const blogName = dto.blogName?.trim() || '我的博客';
      // 兜底值与 KV 仓库默认站点配置、页脚展示保持一致（避免“匿名”与页脚文案不一致）
      const author = dto.author?.trim() || 'Hui Shu';
      db.siteConfig = { blogName, author };
      return db.siteConfig;
    });
  }

  /**
   * 获取相邻文章（上一篇/下一篇）
   * @description 在已发布文章中按发布时间（缺省 createdAt）倒序排列后，
   *              取当前文章前一位为 prev（较新），后一位为 next（较旧）
   * @param id 当前文章 ID
   * @returns prev 为较新的一篇，next 为较旧的一篇；当前文章不在已发布列表中时两者均为 null
   */
  async function getNeighborPosts(id: string): Promise<{ prev: Post | null; next: Post | null }> {
    const db = await deps.repo.read();
    const published = db.posts.filter((p) => !p.isDraft);
    const sorted = published.sort((a, b) => {
      const pa = a.publishedAt || a.createdAt;
      const pb = b.publishedAt || b.createdAt;
      return pb.localeCompare(pa);
    });
    const currentIndex = sorted.findIndex((p) => p.id === id);
    if (currentIndex === -1) {
      return { prev: null, next: null };
    }
    return {
      prev: currentIndex > 0 ? sorted[currentIndex - 1] : null,
      next: currentIndex >= 0 && currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null,
    };
  }

  return {
    listPosts,
    getPost,
    incrementView,
    createPost,
    updatePost,
    deletePost,
    likePost,
    toggleFavorite,
    listFavoritePosts,
    getCategories,
    getTags,
    getConfig,
    updateConfig,
    getNeighborPosts,
  };
}
