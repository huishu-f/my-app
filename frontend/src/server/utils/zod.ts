/**
 * @file zod.ts
 * @description Zod 校验辅助：将校验问题标准化为明细数组、提供常用字符串 schema 与请求体解析器（失败抛 ValidationError）
 */
import { z } from 'zod';
import { ValidationError } from '@server/errors';

/**
 * 将 Zod 校验问题转换为错误响应可携带的明细数组
 * @returns 每项含 path（点号连接的字段路径，如 user.name）与 message（错误文案）
 */
export function formatZodIssues(issues: z.ZodIssue[]): Array<Record<string, unknown>> {
  return issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * 构造“必填、去空白、限长”的字符串 schema：min(1) + max + 先 trim 再校验非纯空白
 * @param field 字段名，用于拼接中文错误提示
 * @param max 最大字符数（trim 后），单位：字符
 * @returns 可组合进对象的 ZodString schema
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
 * 基于 schema 生成请求体解析器：safeParse 失败时抛 ValidationError 并附字段级 details
 * @param schema 目标 Zod schema
 * @param errorLabel 解析失败时对外展示的错误标题
 * @returns 接收 unknown 请求体、返回校验后强类型数据的解析函数
 * @throws 校验不通过时抛出 ValidationError（HTTP 400）
 * @template T schema 解析后的数据类型
 */
export function createParser<T>(schema: z.ZodType<T>, errorLabel: string): (body: unknown) => T {
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
