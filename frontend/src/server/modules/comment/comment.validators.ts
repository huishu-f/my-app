/**
 * @file comment.validators.ts
 * @description 评论模块请求参数校验：评论创建 schema 与解析器，校验失败抛 ValidationError
 */

import 'server-only';
import { z } from 'zod';
import { createParser } from '@server/utils/zod';
import { trimmedNonEmptyString } from '@server/utils/zod';
import type { CreateCommentDto } from '@my-app/shared';

/** 评论创建 schema：content 经 trim 且非空，长度上限 2000 */
const createCommentSchema = z.object({
  content: trimmedNonEmptyString('评论内容', 2000),
});

/**
 * 创建评论请求体解析器
 * @throws 校验失败时抛出 ValidationError
 */
export const parseCreateCommentBody = createParser<CreateCommentDto>(
  createCommentSchema,
  '评论参数验证失败',
);
