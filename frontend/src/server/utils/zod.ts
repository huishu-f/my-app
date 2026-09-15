/**
 * @file zod.ts
 * @description Zod 校验工具函数，供各模块 validator 复用
 */

import { z } from 'zod';
import { ValidationError } from '@server/errors';

/**
 * 将 Zod 校验错误格式化为可读的 issue 数组
 */
export function formatZodIssues(issues: z.ZodIssue[]): Array<Record<string, unknown>> {
  return issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * 创建 trim + 非空 + 长度限制的字符串 schema
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
 * Zod 校验工厂 — 统一 safeParse + throw ValidationError 模式，消除 9 个 parseXxxBody 函数中的重复 try/throw 样板
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
