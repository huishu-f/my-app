import { z } from "zod";
import type { ValidationErrorDetail, ValidationRule } from "../types/ui";

export const IMAGE_URL_INVALID_MESSAGE = "请填写以 https 开头的图片链接，或以 / 开头的站内路径";

export function isSafeImageUrl(src: string): boolean {
  const value = src.trim();
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function optionalImageUrlSchema(field: string, max: number, message: string) {
  return z
    .string()
    .max(max, `${field}不能超过 ${max} 个字符`)
    .refine((v) => v === "" || isSafeImageUrl(v), { message, params: { rule: "imageUrl" } })
    .optional();
}

export function trimmedNonEmptyString(field: string, max: number) {
  return z
    .string()
    .min(1, `${field}不能为空`)
    .max(max, `${field}不能超过 ${max} 个字符`)
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, {
      message: `${field}不能只包含空白字符`,
      params: { rule: "nonBlank" },
    });
}

export function formatZodIssues(issues: z.ZodError["issues"]): ValidationErrorDetail[] {
  return issues.map((issue) => {
    const detail: ValidationErrorDetail = {
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    };

    const extra = issue as { minimum?: unknown; maximum?: unknown; params?: unknown };
    const min = typeof extra.minimum === "number" ? extra.minimum : undefined;
    const max = typeof extra.maximum === "number" ? extra.maximum : undefined;
    if (min !== undefined || max !== undefined) {
      detail.params = { ...(min !== undefined && { min }), ...(max !== undefined && { max }) };
    }

    const rule = (extra.params as { rule?: unknown } | undefined)?.rule;
    if (typeof rule === "string") detail.rule = rule as ValidationRule;
    return detail;
  });
}
