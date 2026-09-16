/**
 * @file auth.validators.ts
 * @description 认证模块请求参数校验：注册、登录、修改密码、更新个人资料的 zod schema
 *              及对应解析器。所有解析器校验失败时抛出 ValidationError（含字段级错误信息）。
 *              仅限服务端（server-only）。
 */

import 'server-only';
import { z } from 'zod';
import { createParser, formatZodIssues } from '@server/utils/zod';
import { ValidationError } from '@server/errors';

/** 密码通用校验规则：字符串长度 6-128 位，注册与改密共用 */
const passwordSchema = z.string().min(6, '密码长度不能少于6位').max(128, '密码长度不能超过128位');

/**
 * 注册参数校验 schema
 * email 需为合法邮箱格式；password 长度 6-128 位；
 * firstName/lastName 先 trim 再校验非空且不超过 50 字符；
 * username 先 trim 再校验长度 3-30 且仅含字母、数字、下划线
 */
export const registerSchema = z.object({
  /** 注册邮箱，需符合邮箱格式 */
  email: z.string().email('邮箱格式不正确'),
  /** 注册密码，长度 6-128 位 */
  password: passwordSchema,
  /** 名，trim 后非空且不超过 50 字符 */
  firstName: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(1, 'firstName 不能为空').max(50, 'firstName 不能超过50个字符'),
  ),
  /** 姓，trim 后非空且不超过 50 字符 */
  lastName: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(1, 'lastName 不能为空').max(50, 'lastName 不能超过50个字符'),
  ),
  /** 用户名，trim 后长度 3-30，仅允许字母、数字、下划线 */
  username: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z
      .string()
      .min(3, '用户名长度不能少于3位')
      .max(30, '用户名长度不能超过30位')
      .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  ),
});

/**
 * 登录参数校验 schema
 * email 先 trim 再校验邮箱格式；password 仅要求非空
 */
export const loginSchema = z.object({
  /** 登录邮箱，trim 后需符合邮箱格式 */
  email: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().email('邮箱格式不正确'),
  ),
  /** 登录密码，非空即可 */
  password: z.string().min(1, '密码不能为空'),
});

/**
 * 修改密码参数校验 schema
 * currentPassword 非空；newPassword 长度 6-128 位；
 * refine 约束新旧密码不能相同，冲突时错误挂在 newPassword 字段上
 */
export const changePasswordSchema = z
  .object({
    /** 当前密码，非空 */
    currentPassword: z.string().min(1, '当前密码不能为空'),
    /** 新密码，长度 6-128 位，且不能与当前密码相同 */
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: '新密码不能与当前密码相同',
    path: ['newPassword'],
  });

/**
 * 更新个人资料校验 schema
 * 所有字段均可选；avatar/website 需为空串或以 http://、https:// 开头的 URL，且有长度上限；
 * 字符串字段的 trim 在 parseUpdateProfileBody 中统一处理
 */
export const updateProfileSchema = z.object({
  /** 名，可选，不超过 50 字符 */
  firstName: z.string().max(50, '名不能超过50个字符').optional(),
  /** 姓，可选，不超过 50 字符 */
  lastName: z.string().max(50, '姓不能超过50个字符').optional(),
  /** 头像 URL，可选，空串或 http(s) 开头，不超过 500 字符 */
  avatar: z
    .string()
    .max(500, '头像URL不能超过500个字符')
    .refine((url) => url === '' || /^https?:\/\//.test(url), '头像URL必须以 http:// 或 https:// 开头')
    .optional(),
  /** 个人简介，可选，不超过 280 字符 */
  bio: z.string().max(280, '简介不能超过280个字符').optional(),
  /** 所在地，可选，不超过 100 字符 */
  location: z.string().max(100, '所在地不能超过100个字符').optional(),
  /** 个人网站 URL，可选，空串或 http(s) 开头，不超过 200 字符 */
  website: z
    .string()
    .max(200, '网站URL不能超过200个字符')
    .refine((url) => url === '' || /^https?:\/\//.test(url), '网站URL必须以 http:// 或 https:// 开头')
    .optional(),
});

/** 注册参数解析器，基于 registerSchema 生成，校验失败抛 ValidationError */
const _parseRegister = createParser(
  registerSchema,
  '注册参数验证失败',
);

/**
 * 解析并规范化注册请求体
 * @param body 未知类型的请求体
 * @returns 规范化后的注册参数，email 统一转为小写
 * @throws 校验失败时抛出 ValidationError
 */
export function parseRegisterBody(body: unknown): {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
} {
  const data = _parseRegister(body);
  return { ...data, email: data.email.toLowerCase() };
}

/** 登录参数解析器，基于 loginSchema 生成，校验失败抛 ValidationError */
const _parseLogin = createParser(
  loginSchema,
  '登录参数验证失败',
);

/**
 * 解析并规范化登录请求体
 * @param body 未知类型的请求体
 * @returns 规范化后的登录参数，email 统一转为小写
 * @throws 校验失败时抛出 ValidationError
 */
export function parseLoginBody(body: unknown): { email: string; password: string } {
  const data = _parseLogin(body);
  return { ...data, email: data.email.toLowerCase() };
}

/**
 * 修改密码请求体解析器
 * @param body 未知类型的请求体，含 currentPassword/newPassword
 * @returns 校验通过后的修改密码参数
 * @throws 校验失败时抛出 ValidationError
 */
export const parseChangePasswordBody = createParser(
  changePasswordSchema,
  '修改密码参数验证失败',
);

/**
 * 解析并规范化更新资料请求体
 * @description 仅返回提交且通过校验的字段；字符串字段统一去除首尾空白（avatar/website 亦 trim）
 * @param body 未知类型的请求体
 * @returns 更新字段字典（key 为字段名，value 为 trim 后的字符串），未提交的字段不出现在结果中
 * @throws 校验失败时抛出 ValidationError
 */
export function parseUpdateProfileBody(body: unknown): Record<string, string | undefined> {
  const result = updateProfileSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('资料参数验证失败', formatZodIssues(result.error.issues));
  }
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
