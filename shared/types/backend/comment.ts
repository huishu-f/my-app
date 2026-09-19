/**
 * @file 评论模块后端接口契约
 * @description 定义评论域的后端分层契约：评论的增删改查、按文章批量删除、用户资料同步等业务服务与数据仓储接口
 */

import type { Comment, CreateCommentDto, ListCommentsOptions } from '../comment';

/**
 * 评论业务服务接口
 * @description 评论域核心业务层契约，供各后端适配实现 */
export interface CommentService {
  /**
   * 获取评论列表
   * @param options 查询选项（文章ID + 认证上下文）
   * @returns 该文章下的评论列表
   */
  listComments(options: ListCommentsOptions): Promise<Comment[]>;
  /**
   * 创建评论
   * @param dto 评论内容（附加 postId 目标文章与 userId 评论者）
   * @returns 创建后的评论实体
   */
  createComment(dto: CreateCommentDto & { postId: string; userId: string }): Promise<Comment>;
  /**
   * 更新评论内容
   * @param id 评论ID
   * @param content 新的评论内容
   * @param currentUserId 当前操作用户ID（校验评论者本人权限）
   * @returns 更新后的评论实体
   * @throws 非本人评论时抛出权限错误
   */
  updateComment(id: string, content: string, currentUserId: string): Promise<Comment>;
  /**
   * 删除评论
   * @param id 评论ID
   * @param currentUserId 当前操作用户ID（评论者或文章作者可删）
   * @returns 被删除的评论对象（含 postId，供调用方失效对应文章缓存）
   * @throws 无权删除时抛出权限错误
   */
  deleteComment(id: string, currentUserId: string): Promise<Comment>;
  /**
   * 按文章批量删除评论
   * @description 删除文章时级联清理其全部评论
   * @param postId 目标文章ID
   * @returns 删除的评论条数
   */
  deleteCommentsByPostId(postId: string): Promise<number>;
}

/**
 * 评论数据仓储接口
 * @description 评论持久化层契约，供文件/数据库等不同存储适配实现 */
export interface CommentRepository {
  /**
   * 查询全部评论
   * @returns 全量评论列表
   */
  findAll(): Promise<Comment[]>;
  /**
   * 按 ID 查询评论
   * @param id 评论ID
   * @returns 评论实体，不存在返回 undefined
   */
  findById(id: string): Promise<Comment | undefined>;
  /**
   * 按文章 ID 查询评论列表
   * @param postId 目标文章ID
   * @returns 该文章下的评论列表
   */
  findByPostId(postId: string): Promise<Comment[]>;
  /**
   * 创建评论
   * @param comment 完整评论实体
   * @returns 落库后的评论实体
   */
  create(comment: Comment): Promise<Comment>;
  /**
   * 部分更新评论
   * @param id 评论ID
   * @param partial 待合并的字段子集
   * @returns 更新后的评论实体，评论不存在返回 undefined
   */
  update(id: string, partial: Partial<Comment>): Promise<Comment | undefined>;
  /**
   * 删除评论
   * @param id 评论ID
   * @returns 是否删除成功
   */
  delete(id: string): Promise<boolean>;
  /**
   * 按文章 ID 删除全部评论
   * @param postId 目标文章ID
   * @returns 删除的评论条数
   */
  deleteByPostId(postId: string): Promise<number>;
  /**
   * 按用户 ID 批量同步用户名与头像
   * @description 用户资料变更后，同步更新其历史评论中的冗余展示字段
   * @param userId 目标用户ID
   * @param userName 新用户名
   * @param userAvatar 新头像地址，可选
   * @returns 更新的评论条数
   */
  updateUserInfoByUserId(userId: string, userName: string, userAvatar?: string): Promise<number>;
  /**
   * 种子数据初始化
   * @param data 初始评论数据
   */
  seed(data: Comment[]): Promise<void>;
}
