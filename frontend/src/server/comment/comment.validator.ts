import "server-only";
import { createParser } from "@server/common/zod";
import { createCommentSchema } from "@my-app/shared";
import type { CreateCommentDto } from "@my-app/shared";

export const parseCreateCommentBody = createParser<CreateCommentDto>(
  createCommentSchema,
  "Comment validation failed",
);
