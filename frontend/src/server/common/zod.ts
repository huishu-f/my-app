import { z } from "zod";
import { ValidationError } from "@server/common/errors";
import { formatZodIssues } from "@my-app/shared";

export function createParser<T>(schema: z.ZodType<T>, errorLabel: string): (body: unknown) => T {
  return (body: unknown): T => {
    const result = schema.safeParse(body);
    if (!result.success) {
      throw new ValidationError(errorLabel, formatZodIssues(result.error.issues));
    }
    return result.data;
  };
}
