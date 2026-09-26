import { z } from "zod";
import {
  IMAGE_URL_INVALID_MESSAGE,
  optionalImageUrlSchema,
  trimmedNonEmptyString,
} from "./primitives";

export const postCreateSchema = z.object({
  title: trimmedNonEmptyString("标题", 200),

  summary: z.string().max(500, "摘要不能超过 500 个字符").optional(),

  content: trimmedNonEmptyString("正文", 200000),

  category: trimmedNonEmptyString("分类", 50),

  tags: z
    .string()
    .max(300)
    .or(z.array(z.string().max(30)))
    .optional(),

  isDraft: z.boolean({ message: "isDraft 必须是布尔值" }),

  pinned: z.boolean().optional(),

  coverImage: optionalImageUrlSchema("封面图链接", 2000, IMAGE_URL_INVALID_MESSAGE),
});

export const postUpdateSchema = postCreateSchema.partial();

export type PostFormField = "title" | "content" | "category" | "summary" | "coverImage";
