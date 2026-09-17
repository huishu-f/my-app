/**
 * @file blog.service.ts
 * @description 博客核心业务服务：文章增删改查、列表分页/筛选/排序、浏览量与点赞收藏、分类标签聚合、站点配置与前后篇导航；仅服务端使用
 */

import { randomUUID } from 'node:crypto';
import 'server-only';
import { after } from 'next/server';

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
import { allowedImageHostsLabel, isSafeImageUrl } from '@/lib/validators';
import { generateSummary } from './summary.service';
import { renderMarkdown } from './markdown.service';

export type { BlogService };

/**
 * 由标题生成 URL slug
 * @param title 文章标题
 * @returns 仅含小写字母、数字、中文与连字符的字符串，最长 30 字符；无有效字符时返回空串
 */
export function slug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // 剥离组合音标符号，去掉重音（如 é→e）
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-') // 保留小写字母/数字/中日韩汉字，其余连续字符折叠为连字符
    .replace(/^-+|-+$/g, '')
    .slice(0, 30); // slug 长度上限：30 字符
}

/**
 * 生成文章 ID
 * @param title 文章标题，用于生成可读的 slug 片段
 * @returns 形如 `{毫秒时间戳}-{slug}-{随机8位}` 的唯一 ID；标题无有效字符时 slug 回退 'post'
 */
export function generatePostId(title: string): string {
  const titleSlug = slug(title);
  const slugPart = titleSlug || 'post';

  // 时间戳保证有序、随机后缀（uuid 前 8 位）保证同毫秒并发生成不冲突
  return `${Date.now()}-${slugPart}-${randomUUID().slice(0, 8)}`;
}

/**
 * 归一化标签输入
 * @param input 逗号分隔字符串、字符串数组或 undefined/null
 * @returns 去空白、转小写、去重后的标签数组，最多 20 个；入参为空时返回空数组
 */
export function parseTags(input: string | string[] | undefined): string[] {
  if (input === undefined || input === null) return [];

  const rawArray = Array.isArray(input) ? input : input.split(','); // 字符串按逗号切分，数组原样使用
  const tags = [
    ...new Set(rawArray.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0)), // trim+小写后去重去空
  ].slice(0, 20); // 单篇文章标签上限：20 个

  return tags;
}

/**
 * 校验封面图 URL
 * @param value 封面图链接；undefined 或空串视为无封面，直接放行
 * @throws 链接非白名单图床 https 时抛出 UnprocessableEntityError
 */
export function validateCoverImage(value: string | undefined): void {
  if (value === undefined || value === '') return;
  if (!isSafeImageUrl(value)) {
    throw new UnprocessableEntityError(
      `coverImage 仅支持白名单图床的 https 链接：${allowedImageHostsLabel()}`,
    );
  }
}

/** 列表场景正文截断长度：超过则裁剪为摘要，避免整篇 Markdown 进列表 payload */
const LIST_CONTENT_LIMIT = 300;

/**
 * 列表场景裁剪文章：正文截断为摘要（详情页会用完整正文，列表页不需要）
 * @param post 原始文章
 * @returns content 截断后的浅拷贝（其余字段原样引用）
 */
function toListPost(post: Post): Post {
  if (post.content.length <= LIST_CONTENT_LIMIT) return post;
  return { ...post, content: `${post.content.slice(0, LIST_CONTENT_LIMIT)}…` };
}

/**
 * 依据现存文章重算有效分类集合
 * @param posts 全部文章
 * @returns 去重后的分类列表；仅统计已发布（非草稿）且分类非空的贡献
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
 * 去除首尾空白并保证非空
 * @param value 原始文本
 * @param field 字段中文名，用于错误提示
 * @returns trim 后的非空文本
 * @throws 文本为空时抛出 ValidationError
 */
function normalizeText(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ValidationError(`${field} 不能为空`);
  }
  return trimmed;
}

/**
 * 断言当前用户是文章作者，否则拒绝操作
 * @param post 目标文章
 * @param currentUserId 当前用户 ID
 * @throws 文章无作者信息或作者不匹配时抛出 ForbiddenError
 */
function assertPostOwner(post: Post, currentUserId: string): void {
  if (!post.authorId) {
    // 历史数据可能缺 authorId（无归属），保守拒绝修改以防越权
    throw new ForbiddenError('该文章无作者信息，无法操作');
  }
  if (post.authorId !== currentUserId) {
    throw new ForbiddenError('无权操作该文章');
  }
}

/**
 * 创建博客业务服务实例（工厂函数，注入仓储依赖便于测试与解耦）
 * @param deps 依赖仓储集合
 * @returns 暴露文章列表/详情/增删改、浏览点赞收藏、分类标签配置及前后篇导航等方法的 BlogService
 */
export function createBlogService(deps: {
  /** 博客数据仓储 */
  repo: BlogRepository;
  /** 用户仓储：作者信息与统计维护 */
  userRepo: UserRepository;
  /** 评论仓储：删除文章时级联清理评论 */
  commentRepo: CommentRepository;
}): BlogService {
  /**
   * 分页查询文章列表
   * @param options 查询项：draft 草稿模式、category/tag/q 筛选、page/limit 分页、user 当前用户
   * @returns 分页结果 { posts, total, page, limit, totalPages }；草稿模式下未登录返回空列表
   */
  async function listPosts(options: ListPostsOptions): Promise<PostsListData> {
    const db = await deps.repo.read();
    let posts = db.posts;

    const isDraftMode = options.draft === true;
    const hasUser = !!options.user;

    if (isDraftMode) {
      if (!hasUser) {
        // 草稿列表必须登录，匿名访问直接返回空分页而非报错
        return {
          posts: [],
          total: 0,
          page: options.page ?? 1,
          limit: options.limit ?? 10,
          totalPages: 0,
        };
      }
      // 草稿模式只看自己的草稿
      posts = posts.filter((p) => p.isDraft && p.authorId === options.user!.id);
    } else {
      posts = posts.filter((p) => !p.isDraft); // 普通列表仅含已发布文章
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
      // 关键词对标题与正文做不区分大小写的包含匹配
      posts = posts.filter(
        (p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q),
      );
    }

    const sorted = sortPosts(posts, isDraftMode);
    const total = sorted.length;
    const page = Math.max(1, options.page ?? 1); // 页码下限 1
    // 每页默认 10、下限 1；公开 API 硬上限 100 防超大分页滥用，内部调用（sitemap）上限 1000
    const maxLimit = options.internal ? 1000 : 100;
    const limit = Math.min(maxLimit, Math.max(1, options.limit ?? 10));
    const start = (page - 1) * limit;
    // 列表下发摘要版正文（截断），整篇 Markdown 只在详情接口返回
    const paged = sorted.slice(start, start + limit).map(toListPost);

    return { posts: paged, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * 排序文章（就地排序并返回同一数组）
   * @param posts 待排序文章
   * @param isDraftMode 是否草稿模式，决定排序规则
   * @returns 排序后的数组：草稿按更新时间倒序；已发布置顶优先、其余按发布时间倒序
   */
  function sortPosts(posts: Post[], isDraftMode: boolean): Post[] {
    if (isDraftMode) {
      return posts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); // 草稿：最近编辑的在前
    }
    return posts.sort((a, b) => {
      const pinnedA = a.pinned ? 1 : 0;
      const pinnedB = b.pinned ? 1 : 0;
      if (pinnedA !== pinnedB) return pinnedB - pinnedA; // 置顶文章优先
      const pa = a.publishedAt || a.createdAt;
      const pb = b.publishedAt || b.createdAt;
      return pb.localeCompare(pa); // 其余按发布时间倒序（无发布时间回退创建时间）
    });
  }

  /**
   * 获取文章详情
   * @param id 文章 ID
   * @param user 当前用户（可选），用于草稿可见性判断
   * @returns 文章对象，其中 content 为渲染后的 HTML、contentRaw 为原始 Markdown
   * @throws NotFoundError 文章不存在，或为草稿且访问者非作者（草稿对外按“不存在”隐藏）
   */
  async function getPost(id: string, user?: { id: string }): Promise<Post> {
    const db = await deps.repo.read();
    const post = db.posts.find((p) => p.id === id);
    if (!post) {
      throw new NotFoundError('文章不存在');
    }
    if (post.isDraft) {
      // 非作者访问草稿按“不存在”处理，避免暴露草稿的存在
      if (!user || user.id !== post.authorId) {
        throw new NotFoundError('文章不存在');
      }
    }

    const renderedPost: Post = {
      ...post,
      content: renderMarkdown(post.content), // 展示用 HTML
      contentRaw: post.content, // 编辑用原始 Markdown
    };

    return renderedPost;
  }

  /**
   * 记录一次浏览（文章浏览量与作者浏览统计）
   * @param id 文章 ID
   * @returns 始终 resolve；写入为尽力而为，不抛异常
   */
  async function incrementView(id: string): Promise<void> {
    const db = await deps.repo.read();
    const post = db.posts.find((p) => p.id === id);
    // 不存在或草稿不计浏览量
    if (!post || post.isDraft) return;

    const postId = post.id;
    const authorId = post.authorId;

    // after()：响应返回后在同一 serverless 生命周期内执行写入，
    // 替代裸 fire-and-forget——后者在响应后函数可能被冻结/回收，写入被静默丢弃
    after(async () => {
      try {
        await deps.repo.incrementView(postId);
      } catch (err) {
        logger.error('浏览量写入失败', {
          postId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      // 累加作者的浏览统计（原子增量，尽力而为，失败仅记日志）
      if (authorId) {
        try {
          await deps.userRepo.incrementStats(authorId, 'views', 1);
        } catch (err) {
          logger.error('作者浏览量统计更新失败', {
            authorId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    });
  }

  /**
   * 创建文章（草稿或直发）
   * @param dto 文章字段，并附 authorId
   * @returns 创建后的文章
   * @throws NotFoundError 作者不存在；ValidationError 标题/正文/分类为空；UnprocessableEntityError 封面非法
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
    const summary = dto.summary?.trim() || generateSummary(content); // 未填摘要则按正文自动生成
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
      pinned: isDraft ? false : Boolean(dto.pinned), // 草稿不置顶
      coverImage: dto.coverImage?.trim() || undefined,
      authorId: dto.authorId,
      authorName: `${author.firstName} ${author.lastName}`.trim() || author.username,
      views: 0,
      likes: 0,
      favorites: 0,
      commentsCount: 0,
    };

    // 仅正式发布记录发布时间
    if (!isDraft) {
      post.publishedAt = now;
    }

    await deps.repo.updateWithRetry((db) => {
      db.posts.push(post);

      // 发布时才刷新分类集合，草稿不影响公开分类
      if (!isDraft) {
        db.categories = cleanupCategories(db.posts);
      }
    });

    // 只有正式发布才累加作者文章数统计，草稿不计（原子增量）
    if (!isDraft) {
      await deps.userRepo.incrementStats(dto.authorId, 'articles', 1);
    }

    return post;
  }

  /**
   * 更新文章（支持草稿与已发布互转）
   * @param id 文章 ID
   * @param dto 需更新的字段，未提供项保持原值
   * @param currentUserId 当前用户 ID，须为文章作者
   * @returns 更新后的文章
   * @throws NotFoundError 文章不存在；ForbiddenError 非作者；ValidationError 文本为空；UnprocessableEntityError 封面非法
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

      // 摘要优先级：显式传入的 summary > 正文变更后自动重算 > 保持原摘要
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

      // 草稿→发布：记录本次发布时间
      if (wasDraft && !isDraft) {
        updatedPost.publishedAt = now;
      }

      // 发布→撤回为草稿：清除发布时间
      if (!wasDraft && isDraft) {
        updatedPost.publishedAt = undefined;
      }

      db.posts[index] = updatedPost;
      db.categories = cleanupCategories(db.posts);
      return updatedPost;
    });

    if (prevIsDraft && !updated.isDraft) {
      // 由草稿转为发布：作者文章数 +1（原子增量）
      if (prevAuthorId) {
        await deps.userRepo.incrementStats(prevAuthorId, 'articles', 1);
      }
    } else if (!prevIsDraft && updated.isDraft) {
      // 由发布撤回为草稿：作者文章数 -1（原子增量，下限钳制为 0）
      if (prevAuthorId) {
        await deps.userRepo.incrementStats(prevAuthorId, 'articles', -1);
      }
    }

    return updated;
  }

  /**
   * 删除文章并级联清理关联数据
   * @param id 文章 ID
   * @param currentUserId 当前用户 ID，须为文章作者
   * @throws NotFoundError 文章不存在；ForbiddenError 非作者
   */
  async function deletePost(id: string, currentUserId: string): Promise<void> {
    const post = await deps.repo.updateWithRetry<Post>((db) => {
      const index = db.posts.findIndex((p) => p.id === id);
      if (index === -1) {
        throw new NotFoundError('文章不存在');
      }
      const target = db.posts[index];
      assertPostOwner(target, currentUserId);

      // 移除文章后立即重算分类，保持分类集合与实际文章一致
      db.posts.splice(index, 1);
      db.categories = cleanupCategories(db.posts);
      return target;
    });

    // 级联删除该文章下的评论；失败仅记日志，不回滚文章删除
    try {
      await deps.commentRepo.deleteByPostId(id);
    } catch (err) {
      logger.error('级联删除评论失败', {
        postId: id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // 清理所有用户对该文章的点赞/收藏引用，避免悬空 ID
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

    // 删除已发布文章才回退作者文章数（原子增量，下限 0）；尽力而为，失败仅记日志
    if (!post.isDraft && post.authorId) {
      try {
        await deps.userRepo.incrementStats(post.authorId, 'articles', -1);
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
   * @param id 文章 ID
   * @param currentUserId 当前用户 ID
   * @returns { liked 当前是否已点赞, likes 文章最新点赞数 }
   * @throws NotFoundError 用户或文章不存在；ForbiddenError 草稿文章不可操作
   */
  async function likePost(
    id: string,
    currentUserId: string,
  ): Promise<{ liked: boolean; likes: number }> {
    const result = await toggleUserPostAssociation(id, currentUserId, 'likedArticles', 'likes');
    // 同步作者的获赞统计：本次为取消点赞则 -1，否则 +1（原子增量，尽力而为）
    if (result.authorId) {
      try {
        await deps.userRepo.incrementStats(result.authorId, 'likes', result.wasPresent ? -1 : 1);
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
   * @param id 文章 ID
   * @param currentUserId 当前用户 ID
   * @returns { favorited 当前是否已收藏, favorites 文章最新收藏数 }
   * @throws NotFoundError 用户或文章不存在；ForbiddenError 草稿文章不可操作
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
   * 点赞/收藏的通用切换逻辑：先更新用户关联列表，再原子更新文章计数，后者失败则回滚前者
   * @param id 文章 ID
   * @param currentUserId 当前用户 ID
   * @param userField 用户侧关联列表字段（likedArticles / favoritedArticles）
   * @param postField 文章侧计数字段（likes / favorites）
   * @returns { wasPresent 切换前是否已关联, count 文章最新计数, authorId 文章作者 ID }
   * @throws NotFoundError 用户或文章不存在；ForbiddenError 草稿文章不可操作
   */
  async function toggleUserPostAssociation(
    id: string,
    currentUserId: string,
    userField: 'likedArticles' | 'favoritedArticles',
    postField: 'likes' | 'favorites',
  ): Promise<{ wasPresent: boolean; count: number; authorId?: string }> {
    const user = await deps.userRepo.findById(currentUserId);
    if (!user) throw new NotFoundError('用户不存在');

    // 原子切换用户关联列表：CAS 内基于最新数据判断当前是否已关联，并发双击也只会切换一次
    let wasPresent = false;
    const toggled = await deps.userRepo.toggleAssociation(
      currentUserId,
      userField,
      id,
      (present) => {
        wasPresent = present;
      },
    );
    if (!toggled) throw new NotFoundError('用户不存在');

    let count = 0;
    let authorId: string | undefined;
    try {
      await deps.repo.updateWithRetry((db) => {
        const post = db.posts.find((p) => p.id === id);
        if (!post) throw new NotFoundError('文章不存在');
        if (post.isDraft) throw new ForbiddenError('草稿文章不可操作');
        post[postField] = wasPresent
          ? Math.max(0, (post[postField] ?? 0) - 1) // 取消：计数 -1，下限 0
          : (post[postField] ?? 0) + 1; // 新增：计数 +1
        count = post[postField];
        authorId = post.authorId;
      });
    } catch (blogErr) {
      // 文章计数更新失败 → 回滚用户关联列表（同样原子切换回来），保持两侧一致
      await deps.userRepo.toggleAssociation(currentUserId, userField, id).catch((rollbackErr) => {
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
   * 列出当前用户收藏的文章
   * @param currentUserId 当前用户 ID
   * @returns 已发布且仍存在的收藏文章；无收藏时返回空数组
   * @throws NotFoundError 用户不存在
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
    // 过滤掉已删除或已撤回为草稿的收藏，只保留可见的已发布文章；正文裁剪为摘要（收藏列表不消费全文）
    return favoritedIds
      .map((fid) => db.posts.find((p) => p.id === fid))
      .filter((p): p is Post => !!p && !p.isDraft)
      .map(toListPost);
  }

  /**
   * 获取分类列表
   * @returns 现存已发布文章贡献的分类集合
   */
  async function getCategories(): Promise<string[]> {
    const db = await deps.repo.read();
    return db.categories;
  }

  /**
   * 聚合标签及其文章数
   * @returns 按标签名升序排列的 { name, count } 列表，仅统计已发布文章
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
   * @returns 当前 SiteConfig（blogName、author）
   */
  async function getConfig(): Promise<SiteConfig> {
    const db = await deps.repo.read();
    return db.siteConfig;
  }

  /**
   * 更新站点配置（仅管理员）
   * @param dto 新配置字段
   * @param userId 操作者用户 ID
   * @returns 更新后的 SiteConfig
   * @throws NotFoundError 用户不存在；ForbiddenError 非管理员
   */
  async function updateConfig(dto: UpdateSiteConfigDto, userId: string): Promise<SiteConfig> {
    const user = await deps.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }
    // 站点配置为全局资源，仅 Admin 角色可改
    if (user.role !== 'Admin') {
      throw new ForbiddenError('无权修改站点配置');
    }

    return deps.repo.updateWithRetry<SiteConfig>((db) => {
      const blogName = dto.blogName?.trim() || '我的博客'; // 传空则回退默认博客名

      const author = dto.author?.trim() || 'Hui Shu'; // 传空则回退默认作者名
      db.siteConfig = { blogName, author };
      return db.siteConfig;
    });
  }

  /**
   * 获取相邻文章（用于详情页上/下篇导航）
   * @param id 当前文章 ID
   * @returns { prev, next }，均为已发布文章；越界或当前文章不在发布列表时对应项为 null
   */
  async function getNeighborPosts(id: string): Promise<{ prev: Post | null; next: Post | null }> {
    const db = await deps.repo.read();
    const published = db.posts.filter((p) => !p.isDraft);
    // 与列表一致按发布时间倒序（最新在前）
    const sorted = published.sort((a, b) => {
      const pa = a.publishedAt || a.createdAt;
      const pb = b.publishedAt || b.createdAt;
      return pb.localeCompare(pa);
    });
    const currentIndex = sorted.findIndex((p) => p.id === id);
    if (currentIndex === -1) {
      return { prev: null, next: null };
    }
    // 倒序列表中：prev 为更靠前（更新）的一篇，next 为更靠后（更早）的一篇
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
