import "server-only";
import { z } from "zod";
import { createParser } from "@server/common/zod";
import { postCreateSchema, postUpdateSchema } from "@shared";
import type { CreatePostDto, UpdatePostDto } from "@shared";

export const parseCreatePostBody = createParser<CreatePostDto>(
  postCreateSchema as unknown as z.ZodType<CreatePostDto>,
  "Post validation failed",
);

export const parseUpdatePostBody = createParser<UpdatePostDto>(
  postUpdateSchema as unknown as z.ZodType<UpdatePostDto>,
  "Post validation failed",
);
