import "server-only";
import { createParser } from "@server/common/zod";
import { createCommentSchema } from "@shared";
import type { CreateCommentDto } from "@shared";

export const parseCreateCommentBody = createParser<CreateCommentDto>(
  createCommentSchema,
  "Comment validation failed",
);
