/**
 * @file 评论模块共享类型
 * @description 评论模块共享类型，定义评论实体、发表评论 DTO、评论列表及详情响应数据结构，供前后端共用
 */
import type { AuthPayload } from './user';

/**
 * 评论
 * @description 单条评论实体；评论者姓名与头像为冗余字段，用户资料变更时由后端批量同步
 */
export interface Comment {
  /** 评论唯一ID */
  id: string;
  /** 所属文章ID */
  postId: string;
  /** 评论者用户ID */
  userId: string;
  /** 评论者显示名（冗余，避免展示时反复查用户） */
  userName: string;
  /** 评论者头像地址（冗余） */
  userAvatar?: string;
  /** 评论内容 */
  content: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 发表评论请求体
 * @description POST /api/posts/:postId/comments 的请求体 DTO，仅含评论内容 */
export interface CreateCommentDto {
  /** 评论内容 */
  content: string;
}

/**
 * 评论列表响应数据
 * @description GET /api/posts/:postId/comments 响应的 data 部分 */
export interface CommentsListData {
  /** 该文章下的评论列表（按时间排列） */
  comments: Comment[];
}

/**
 * 评论详情响应数据
 * @description POST /api/posts/:postId/comments、PUT /api/comments/:id 响应的 data 部分 */
export interface CommentData {
  /** 评论详情 */
  comment: Comment;
}

/**
 * 评论列表查询选项（后端内部使用）
 * @description 后端 listComments 的内部参数；`user` 由鉴权中间件注入，前端不传
 */
export interface ListCommentsOptions {
  /** 所属文章ID */
  postId: string;
  /** 认证上下文（后端鉴权中间件注入） */
  user?: AuthPayload;
}

/**
 * 更新评论 mutation 参数
 * @description 前端 hooks 层 useUpdateComment 的变量：目标评论 ID + 更新内容
 */
export interface UpdateCommentMutationVars {
  /** 待更新的评论ID */
  commentId: string;
  /** 更新评论请求体 */
  dto: CreateCommentDto;
}
