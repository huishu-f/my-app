/**
 * @file comment.service.ts
 * @description 评论业务服务：按文章列出/创建/编辑/删除评论，做归属与草稿可见性校验并维护文章评论计数；仅服务端使用
 */

import 'server-only';

import type { Comment, CommentService } from '@my-app/shared';
import { generateId } from '@server/utils/common';
import { ForbiddenError, NotFoundError, ValidationError } from '@server/errors';
import { logger } from '@server/utils/logger';
import sanitizeHtml from 'sanitize-html';
import type { CommentRepository } from '@server/modules/comment/kv-comment.repository';
import type { BlogRepository } from '@server/modules/blog/kv-blog.repository';
import type { UserRepository } from '@server/modules/auth/kv-user.repository';
import type { CreateCommentDto, ListCommentsOptions } from '@my-app/shared';

/**
 * 净化评论内容：剥离所有 HTML 标签与属性，仅保留纯文本
 * @param content 原始评论内容
 * @returns 去标签并 trim 后的纯文本
 */
function sanitizeCommentContent(content: string): string {
  return sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} }).trim(); // 空标签白名单 = 不允许任何 HTML
}

export type { CommentService };

/**
 * 创建评论业务服务实例（工厂函数，注入仓储依赖便于测试与解耦）
 * @param deps 依赖仓储集合
 * @returns 暴露 listComments/createComment/updateComment/deleteComment/deleteCommentsByPostId 的 CommentService
 */
export function createCommentService(deps: {
  /** 评论数据仓储 */
  commentRepo: CommentRepository;
  /** 博客仓储：校验文章存在性并维护评论计数 */
  blogRepo: BlogRepository;
  /** 用户仓储：取评论者展示信息 */
  userRepo: UserRepository;
}): CommentService {
  /**
   * 列出某文章的评论
   * @param options 查询项，含 postId 与当前 user
   * @returns 按创建时间倒序（最新在前）的评论列表
   * @throws NotFoundError 文章不存在，或文章为草稿且访问者非作者（对非作者隐藏草稿）
   */
  async function listComments(options: ListCommentsOptions): Promise<Comment[]> {
    const db = await deps.blogRepo.read();
    const post = db.posts.find((p) => p.id === options.postId);
    // 草稿文章对非作者一律按“不存在”处理，避免泄露草稿存在性
    if (!post || (post.isDraft && post.authorId !== options.user?.id)) {
      throw new NotFoundError('文章不存在');
    }
    const comments = await deps.commentRepo.findByPostId(options.postId);
    return comments.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // createdAt 为 ISO 字符串，字典序即时序，倒序=最新在前
  }

  /**
   * 为文章创建一条评论
   * @param dto 评论内容，并附 postId 与 userId
   * @returns 创建后的评论
   * @throws NotFoundError 文章或用户不存在；ForbiddenError 草稿文章不可评论；ValidationError 内容净化后为空
   */
  async function createComment(
    dto: CreateCommentDto & { postId: string; userId: string },
  ): Promise<Comment> {
    const db = await deps.blogRepo.read();
    const post = db.posts.find((p) => p.id === dto.postId);
    if (!post) {
      throw new NotFoundError('文章不存在');
    }

    if (post.isDraft) {
      throw new ForbiddenError('草稿文章不可评论');
    }

    const user = await deps.userRepo.findById(dto.userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    const now = new Date().toISOString();
    const comment: Comment = {
      id: generateId(),
      postId: dto.postId,
      userId: dto.userId,
      userName: `${user.firstName} ${user.lastName}`.trim() || user.username, // 姓名缺失时回退用户名
      userAvatar: user.avatar || undefined,
      content: sanitizeCommentContent(dto.content),
      createdAt: now,
      updatedAt: now,
    };

    await deps.commentRepo.create(comment);

    // 评论与文章评论计数跨两个仓储、非事务：计数更新失败时删除刚建的评论作为补偿，保证最终一致
    try {
      await deps.blogRepo.updateCommentsCount(dto.postId, 1);
    } catch (err) {
      await deps.commentRepo.delete(comment.id).catch((rollbackErr) => {
        logger.error('回滚评论创建失败', { commentId: comment.id, error: String(rollbackErr) });
      });
      throw err;
    }

    return comment;
  }

  /**
   * 编辑评论内容（仅作者本人）
   * @param id 评论 ID
   * @param content 新内容
   * @param currentUserId 当前用户 ID
   * @returns 更新后的评论
   * @throws NotFoundError 评论不存在（含并发被删）；ForbiddenError 非评论作者；ValidationError 净化后内容为空
   */
  async function updateComment(
    id: string,
    content: string,
    currentUserId: string,
  ): Promise<Comment> {
    const comment = await deps.commentRepo.findById(id);
    if (!comment) {
      throw new NotFoundError('评论不存在');
    }
    if (comment.userId !== currentUserId) {
      throw new ForbiddenError('无权编辑该评论'); // 编辑权限仅限评论作者本人
    }

    const trimmed = sanitizeCommentContent(content);
    if (trimmed.length === 0) {
      throw new ValidationError('评论内容不能为空');
    }

    const now = new Date().toISOString();
    const updated = await deps.commentRepo.update(id, { content: trimmed, updatedAt: now });
    if (!updated) {
      throw new NotFoundError('评论不存在'); // update 返回空说明在权限校验后评论已被并发删除
    }
    return updated;
  }

  /**
   * 删除评论
   * @param id 评论 ID
   * @param currentUserId 当前用户 ID
   * @returns 被删除的评论
   * @throws NotFoundError 评论不存在；ForbiddenError 既非评论作者也非文章作者
   */
  async function deleteComment(id: string, currentUserId: string): Promise<Comment> {
    const comment = await deps.commentRepo.findById(id);
    if (!comment) {
      throw new NotFoundError('评论不存在');
    }

    const db = await deps.blogRepo.read();
    const post = db.posts.find((p) => p.id === comment.postId);

    // 删除权限放宽：评论作者或该文章作者都可删（作者可清理自己文章下的评论）
    const isCommentAuthor = comment.userId === currentUserId;
    const isPostAuthor = post?.authorId === currentUserId;
    if (!isCommentAuthor && !isPostAuthor) {
      throw new ForbiddenError('无权删除该评论');
    }

    await deps.commentRepo.delete(id);

    if (post) {
      await deps.blogRepo.updateCommentsCount(comment.postId, -1); // 仅在文章仍存在时回退评论计数
    }

    return comment;
  }

  /**
   * 删除某篇文章的全部评论（供删除文章时级联调用）
   * @param postId 文章 ID
   * @returns 实际删除的评论数量
   */
  async function deleteCommentsByPostId(postId: string): Promise<number> {
    return deps.commentRepo.deleteByPostId(postId);
  }

  return { listComments, createComment, updateComment, deleteComment, deleteCommentsByPostId };
}
