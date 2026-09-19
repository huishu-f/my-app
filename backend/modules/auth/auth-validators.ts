/**
 * @file auth-validators.ts
 * @description 鉴权相关请求体的 Zod 校验：注册/登录/改密/改资料 schema 及对应解析函数；校验失败抛 ValidationError；仅服务端可用
 */
import { z } from 'zod';
import { createParser, formatZodIssues } from '../../utils/zod';
import { ValidationError } from '../../errors/index';
import { allowedImageHostsLabel, isSafeImageUrl } from '@my-app/shared/lib/validators';

/** 密码通用规则：长度 6–128 位（按字符数计） */
const passwordSchema = z.string().min(6, '密码长度不能少于6位').max(128, '密码长度不能超过128位');

/** 注册请求体校验 */
export const registerSchema = z.object({
  /** 邮箱，格式校验；注册解析时统一转小写 */
  email: z.string().email('邮箱格式不正确'),

  /** 明文密码，须满足 passwordSchema 长度规则 */
  password: passwordSchema,

  /** 名：先 trim 再校验非空、≤50 字符 */
  firstName: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(1, 'firstName 不能为空').max(50, 'firstName 不能超过50个字符'),
  ),

  /** 姓：先 trim 再校验非空、≤50 字符 */
  lastName: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(1, 'lastName 不能为空').max(50, 'lastName 不能超过50个字符'),
  ),

  /** 用户名：先 trim，长度 3–30，仅限字母/数字/下划线 */
  username: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z
      .string()
      .min(3, '用户名长度不能少于3位')
      .max(30, '用户名长度不能超过30位')
      .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  ),
});

/** 登录请求体校验 */
export const loginSchema = z.object({
  /** 邮箱：先 trim 再校验格式；解析时转小写 */
  email: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().email('邮箱格式不正确'),
  ),

  /** 密码：登录仅校验非空，不复评长度规则 */
  password: z.string().min(1, '密码不能为空'),
});

/** 修改密码请求体校验；含 refine 约束新密码不得与当前密码相同 */
export const changePasswordSchema = z
  .object({
    /** 当前密码，仅校验非空 */
    currentPassword: z.string().min(1, '当前密码不能为空'),

    /** 新密码，须满足 passwordSchema 长度规则 */
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: '新密码不能与当前密码相同',
    path: ['newPassword'],
  });

/** 更新资料请求体校验；全部字段 optional，仅更新传入项，长度均为字符数上限 */
export const updateProfileSchema = z.object({
  /** 名，≤50 字符 */
  firstName: z.string().max(50, '名不能超过50个字符').optional(),

  /** 姓，≤50 字符 */
  lastName: z.string().max(50, '姓不能超过50个字符').optional(),

  /** 头像 URL，≤500 字符 */
  avatar: z
    .string()
    .max(500, '头像URL不能超过500个字符')
    // 允许空串 '' 作为清除头像的哨兵值；非空时须命中白名单图床 https 链接
    .refine(
      (url) => url === '' || isSafeImageUrl(url),
      `头像URL仅支持白名单图床的 https 链接：${allowedImageHostsLabel()}`,
    )
    .optional(),

  /** 简介，≤280 字符 */
  bio: z.string().max(280, '简介不能超过280个字符').optional(),

  /** 所在地，≤100 字符 */
  location: z.string().max(100, '所在地不能超过100个字符').optional(),

  /** 个人网站 URL，≤200 字符 */
  website: z
    .string()
    .max(200, '网站URL不能超过200个字符')
    // 允许空串 '' 作为清除网站的哨兵值；非空时须以 http(s):// 开头
    .refine(
      (url) => url === '' || /^https?:\/\//.test(url),
      '网站URL必须以 http:// 或 https:// 开头',
    )
    .optional(),
});

/** 注册解析器：失败时抛 ValidationError('注册参数验证失败') */
const _parseRegister = createParser(registerSchema, '注册参数验证失败');

/**
 * 解析并校验注册请求体
 * @param body 原始请求体
 * @returns 校验通过的注册字段，email 已转小写
 * @throws 校验失败时抛 ValidationError
 */
export function parseRegisterBody(body: unknown): {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
} {
  const data = _parseRegister(body);
  // 邮箱统一小写，保证与登录/查重时的匹配口径一致
  return { ...data, email: data.email.toLowerCase() };
}

/** 登录解析器：失败时抛 ValidationError('登录参数验证失败') */
const _parseLogin = createParser(loginSchema, '登录参数验证失败');

/**
 * 解析并校验登录请求体
 * @param body 原始请求体
 * @returns 校验通过的 email（已转小写）与 password
 * @throws 校验失败时抛 ValidationError
 */
export function parseLoginBody(body: unknown): { email: string; password: string } {
  const data = _parseLogin(body);
  // 邮箱统一小写后比对，与注册写入口径保持一致
  return { ...data, email: data.email.toLowerCase() };
}

/** 解析并校验修改密码请求体；失败时抛 ValidationError('修改密码参数验证失败') */
export const parseChangePasswordBody = createParser(changePasswordSchema, '修改密码参数验证失败');

/**
 * 解析并校验资料更新请求体
 * @param body 原始请求体
 * @returns 仅包含本次传入字段的对象（文本字段 trim 后），未传字段以 undefined 省略，供上层做部分更新
 * @throws 校验失败时抛 ValidationError('资料参数验证失败')
 */
export function parseUpdateProfileBody(body: unknown): Record<string, string | undefined> {
  const result = updateProfileSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('资料参数验证失败', formatZodIssues(result.error.issues));
  }
  // 逐字段判断 undefined：只回填调用方真正提交的键，保持部分更新语义
  const data: Record<string, string | undefined> = {};
  const { firstName, lastName, avatar, bio, location, website } = result.data;
  if (firstName !== undefined) data.firstName = firstName.trim();
  if (lastName !== undefined) data.lastName = lastName.trim();
  if (avatar !== undefined) data.avatar = avatar;
  if (bio !== undefined) data.bio = bio.trim();
  if (location !== undefined) data.location = location.trim();
  if (website !== undefined) data.website = website.trim();
  return data;
}
