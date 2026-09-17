/**
 * @file blog.validators.ts
 * @description 博客请求/查询参数的 zod 校验：解析文章创建·更新、站点配置更新与列表查询入参，失败抛 ValidationError；仅服务端使用
 */

import 'server-only';
import { z } from 'zod';
import { createParser, formatZodIssues, trimmedNonEmptyString } from '@server/utils/zod';
import { ValidationError } from '@server/errors';
import type { CreatePostDto, UpdateSiteConfigDto, UpdatePostDto } from '@my-app/shared';

/** 创建文章请求体校验规则，产出 CreatePostDto */
const postCreateSchema = z.object({
  title: trimmedNonEmptyString('标题', 200),

  summary: z.string().max(500, '摘要不能超过 500 个字符').optional(),

  content: trimmedNonEmptyString('正文', 200000), // 正文上限 20 万字符，防止超大请求体拖垮渲染/存储

  category: trimmedNonEmptyString('分类', 50),

  tags: z
    .string() // 兼容两种入参：逗号分隔字符串（整串最长 300）
    .max(300)
    .or(z.array(z.string().max(30))) // 或字符串数组（单个标签最长 30）
    .optional(),

  isDraft: z.boolean({ message: 'isDraft 必须是布尔值' }),

  pinned: z.boolean().optional(),

  coverImage: z.string().url().optional().or(z.literal('')), // 允许合法 URL 或空串（空串表示清除封面）
});

/** 更新文章校验规则：在创建规则基础上全部字段可选（partial） */
const postUpdateSchema = postCreateSchema.partial();

/** 站点配置更新校验规则：两项均可选，最长各 100 字符 */
const siteConfigSchema = z.object({
  blogName: z.string().max(100, '博客名称不能超过 100 个字符').optional(),

  author: z.string().max(100, '作者名不能超过 100 个字符').optional(),
});

/** 文章列表查询参数校验规则：将 URL query 的字符串转换为强类型（draft→boolean、page/limit→number） */
const listQuerySchema = z.object({
  draft: z
    .string()
    .optional()
    .transform((v) => v === 'true'), // query 无布尔类型，仅当值为字符串 'true' 时视为草稿模式

  category: z.string().max(50).optional(),

  tag: z.string().max(50).optional(),

  q: z.string().max(100).optional(),

  page: z
    .string()
    .optional()
    .transform((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined; // 非法或非正数页码归为 undefined，由 service 兜底默认值
    }),

  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    }),
});

/**
 * 解析并校验创建文章的请求体
 * @returns 校验通过的 CreatePostDto
 * @throws 校验失败时抛出 ValidationError，携带字段级错误信息
 */
export const parseCreatePostBody = createParser<CreatePostDto>(
  postCreateSchema as z.ZodType<CreatePostDto>,
  '文章参数验证失败',
);

/**
 * 解析并校验更新文章的请求体（所有字段可选）
 * @returns 校验通过的 UpdatePostDto
 * @throws 校验失败时抛出 ValidationError，携带字段级错误信息
 */
export const parseUpdatePostBody = createParser<UpdatePostDto>(
  postUpdateSchema as z.ZodType<UpdatePostDto>,
  '文章参数验证失败',
);

/**
 * 解析并校验更新站点配置的请求体
 * @returns 校验通过的 UpdateSiteConfigDto
 * @throws 校验失败时抛出 ValidationError，携带字段级错误信息
 */
export const parseUpdateSiteConfigBody = createParser<UpdateSiteConfigDto>(
  siteConfigSchema as z.ZodType<UpdateSiteConfigDto>,
  '站点配置参数验证失败',
);

/**
 * 解析并校验文章列表查询参数
 * @param query 原始 URL query，值可能是字符串或字符串数组
 * @returns 转换后的强类型查询对象；未提供或非法的 page/limit 为 undefined
 * @throws 校验失败时抛出 ValidationError，携带字段级错误信息
 */
export function parseListQuery(query: Record<string, string | string[] | undefined>): {
  draft?: boolean;
  category?: string;
  tag?: string;
  q?: string;
  page?: number;
  limit?: number;
} {
  const plain: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(query)) {
    plain[key] = Array.isArray(value) ? value[0] : value; // 同名参数出现多次时仅取第一个值
  }
  const result = listQuerySchema.safeParse(plain);
  if (!result.success) {
    throw new ValidationError('列表查询参数验证失败', formatZodIssues(result.error.issues));
  }
  return result.data;
}
