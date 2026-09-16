/**
 * @file Zod 校验工具
 * @description 提供可复用的 zod schema 构造器与校验执行工厂，
 *              供各模块的 validator 统一校验请求参数并抛出 ValidationError
 */

import { z } from 'zod';
import { ValidationError } from '@server/errors';

/**
 * 将 Zod 校验错误格式化为可读的 issue 数组
 * @param issues Zod safeParse 失败后得到的错误列表
 * @returns 每个 issue 只保留 path（点号连接）与 message 的对象数组
 * @example
 * formatZodIssues(result.error.issues) // => [{ path: 'title', message: '标题不能为空' }]
 */
export function formatZodIssues(issues: z.ZodIssue[]): Array<Record<string, unknown>> {
  return issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * 创建 trim + 非空 + 长度限制的字符串 schema
 * @description 先限制长度（1 ~ max），再 transform 去除首尾空白，最后校验 trim 后非空，
 *              排除纯空白字符串
 * @param field 字段中文名，用于拼接错误提示
 * @param max 最大长度
 * @returns zod 字符串 schema，输出 trim 后的字符串
 * @example
 * const title = trimmedNonEmptyString('标题', 100);
 */
export function trimmedNonEmptyString(field: string, max: number) {
  return z
    .string()
    .min(1, `${field}不能为空`)
    .max(max, `${field}不能超过 ${max} 个字符`)
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, { message: `${field}不能只包含空白字符` });
}

/**
 * Zod 校验工厂
 * @description 统一封装 safeParse + 失败抛 ValidationError 模式，
 *              消除各 parseXxxBody 函数中重复的 try/throw 样板
 * @param schema 待执行的 zod schema
 * @param errorLabel 校验失败时抛出的 ValidationError 提示文案
 * @returns 校验函数：入参任意值，校验通过返回类型化结果，失败抛 ValidationError（携带 issue 详情列表）
 * @throws 校验失败时抛出 ValidationError，details 为 formatZodIssues 结果
 * @example
 * const parseLoginBody = createParser(loginSchema, '登录参数验证失败');
 * const dto = parseLoginBody(body); // 校验失败自动抛 ValidationError
 */
export function createParser<T>(
  schema: z.ZodType<T>,
  errorLabel: string,
): (body: unknown) => T {
  return (body: unknown): T => {
    const result = schema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(
        errorLabel,
        formatZodIssues(result.error.issues) as Array<Record<string, unknown>>,
      );
    }
    return result.data;
  };
}
