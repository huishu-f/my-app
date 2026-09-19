/**
 * @file comment-validators.ts
 * @description 评论请求体的 zod 校验：解析并校验创建评论的入参，失败抛出 ValidationError；仅服务端使用
 */

import { z } from 'zod';
import { createParser } from '../../utils/zod';
import { trimmedNonEmptyString } from '../../utils/zod';
import type { CreateCommentDto } from '@my-app/shared';

/** 创建评论请求体校验规则：content 为去空白后的非空字符串，最长 2000 字符 */
const createCommentSchema = z.object({
  content: trimmedNonEmptyString('评论内容', 2000),
});

/**
 * 解析并校验创建评论的请求体
 * @returns 校验通过的 CreateCommentDto
 * @throws 校验失败时抛出 ValidationError，携带字段级错误信息
 */
export const parseCreateCommentBody = createParser<CreateCommentDto>(
  createCommentSchema,
  '评论参数验证失败',
);
