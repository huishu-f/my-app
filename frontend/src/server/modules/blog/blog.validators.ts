/**
 * @file blog.validators.ts
 * @description 博客模块请求参数校验：文章创建/更新、站点配置更新、文章列表查询的
 *              zod schema 与解析器，校验失败抛出 ValidationError。仅限服务端（server-only）。
 */

import 'server-only';
import { z } from 'zod';
import { createParser, formatZodIssues, trimmedNonEmptyString } from '@server/utils/zod';
import { ValidationError } from '@server/errors';
import type { CreatePostDto, UpdateSiteConfigDto, UpdatePostDto } from '@my-app/shared';

/**
 * 文章创建参数 schema
 * title/content/category 经 trim 且非空，长度上限分别为 200/200000/50；
 * summary 可选且上限 500；tags 为最长 300 字符的字符串或每项最长 30 字符的字符串数组；
 * isDraft 必填布尔；pinned 可选布尔；coverImage 为合法 URL 或空串
 */
const postCreateSchema = z.object({
  /** 标题，trim 后非空，最长 200 字符 */
  title: trimmedNonEmptyString('标题', 200),
  /** 摘要，可选，最长 500 字符 */
  summary: z.string().max(500, '摘要不能超过 500 个字符').optional(),
  /** 正文 Markdown，trim 后非空，最长 200000 字符 */
  content: trimmedNonEmptyString('正文', 200000),
  /** 分类名，trim 后非空，最长 50 字符 */
  category: trimmedNonEmptyString('分类', 50),
  /** 标签，逗号分隔字符串（≤300 字符）或字符串数组（每项 ≤30 字符），可选 */
  tags: z
    .string()
    .max(300)
    .or(z.array(z.string().max(30)))
    .optional(),
  /** 是否为草稿 */
  isDraft: z.boolean({ message: 'isDraft 必须是布尔值' }),
  /** 是否置顶，可选 */
  pinned: z.boolean().optional(),
  /** 封面图 URL，合法 URL 或空串 */
  coverImage: z.string().url().optional().or(z.literal('')),
});

/** 文章更新 schema：postCreateSchema 全部字段改为可选，支持部分更新 */
const postUpdateSchema = postCreateSchema.partial();

/**
 * 站点配置更新 schema
 * blogName/author 均可选，长度上限各 100 字符
 */
const siteConfigSchema = z.object({
  /** 博客名称，可选，最长 100 字符 */
  blogName: z.string().max(100, '博客名称不能超过 100 个字符').optional(),
  /** 作者名，可选，最长 100 字符 */
  author: z.string().max(100, '作者名不能超过 100 个字符').optional(),
});

/**
 * 文章列表查询参数 schema（query 字符串输入）
 * draft 按字符串 'true' 转布尔；page/limit 转为正整数，非正数或非法值转 undefined
 */
const listQuerySchema = z.object({
  /** 是否草稿模式，'true' 转为 true，其余转 false */
  draft: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  /** 分类过滤，最长 50 字符 */
  category: z.string().max(50).optional(),
  /** 标签过滤，最长 50 字符 */
  tag: z.string().max(50).optional(),
  /** 关键词搜索，最长 100 字符 */
  q: z.string().max(100).optional(),
  /** 页码，正整数字符串转数值，非法转 undefined */
  page: z
    .string()
    .optional()
    .transform((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }),
  /** 每页条数，正整数字符串转数值，非法转 undefined */
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }),
});

/**
 * 创建文章请求体解析器
 * @param body 未知类型的请求体
 * @returns 校验通过后的 CreatePostDto
 * @throws 校验失败时抛出 ValidationError
 */
export const parseCreatePostBody = createParser<CreatePostDto>(
  postCreateSchema as z.ZodType<CreatePostDto>,
  '文章参数验证失败',
);

/**
 * 更新文章请求体解析器
 * @param body 未知类型的请求体，字段全部可选
 * @returns 校验通过后的 UpdatePostDto
 * @throws 校验失败时抛出 ValidationError
 */
export const parseUpdatePostBody = createParser<UpdatePostDto>(
  postUpdateSchema as z.ZodType<UpdatePostDto>,
  '文章参数验证失败',
);

/**
 * 更新站点配置请求体解析器
 * @param body 未知类型的请求体，含 blogName/author
 * @returns 校验通过后的 UpdateSiteConfigDto
 * @throws 校验失败时抛出 ValidationError
 */
export const parseUpdateSiteConfigBody = createParser<UpdateSiteConfigDto>(
  siteConfigSchema as z.ZodType<UpdateSiteConfigDto>,
  '站点配置参数验证失败',
);

/**
 * 解析文章列表查询参数
 * @description 先把 Next query 对象（值可能为数组）压平为单值 plain object，
 *              再走 schema 校验并完成 draft/page/limit 的类型转换
 * @param query Next 请求的 query 对象，值为字符串或字符串数组时取首元素
 * @returns 规范化后的查询参数，draft/page/limit 已完成类型转换
 * @throws 校验失败时抛出 ValidationError
 */
export function parseListQuery(query: Record<string, string | string[] | undefined>): {
  draft?: boolean;
  category?: string;
  tag?: string;
  q?: string;
  page?: number;
  limit?: number;
} {
  // 将 Next.js 的 query 对象转换为 Zod 可解析的 plain object
  const plain: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(query)) {
    plain[key] = Array.isArray(value) ? value[0] : value;
  }
  const result = listQuerySchema.safeParse(plain);
  if (!result.success) {
    throw new ValidationError('列表查询参数验证失败', formatZodIssues(result.error.issues));
  }
  return result.data;
}
