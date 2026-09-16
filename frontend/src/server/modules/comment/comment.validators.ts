/**
 * @file comment.validators.ts
 * @description 评论模块请求参数校验：定义评论创建 schema 并导出解析器，
 *              校验失败抛出 ValidationError。仅限服务端（server-only）。
 */

import 'server-only';
import { z } from 'zod';
import { createParser } from '@server/utils/zod';
import { trimmedNonEmptyString } from '@server/utils/zod';
import type { CreateCommentDto } from '@my-app/shared';

/**
 * 评论创建 schema
 * content 经 trim 且非空，长度上限 2000 字符
 */
const createCommentSchema = z.object({
  /** 评论内容，trim 后非空，最长 2000 字符 */
  content: trimmedNonEmptyString('评论内容', 2000),
});

/**
 * 创建评论请求体解析器
 * @param body 未知类型的请求体，含 content 字段
 * @returns 校验通过后的 CreateCommentDto
 * @throws 校验失败时抛出 ValidationError
 */
export const parseCreateCommentBody = createParser<CreateCommentDto>(
  createCommentSchema,
  '评论参数验证失败',
);
