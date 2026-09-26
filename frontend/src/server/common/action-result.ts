import "server-only";
import { headers } from "next/headers";
import type { ValidationErrorDetail } from "@my-app/shared";
import { isAppError } from "@server/common/errors";
import { logger } from "@server/common/logger";
import { getClientIp } from "@server/common/rate-limit";

export async function clientIp(): Promise<string> {
  return getClientIp({ headers: await headers() });
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; details?: ValidationErrorDetail[] };

const INTERNAL_ERROR = "Internal server error";

export function toFailure(
  err: unknown,
  label = "Server Action",
): Extract<ActionResult<never>, { ok: false }> {
  if (!isAppError(err)) {
    logger.error(err instanceof Error ? err.message : `${label} unknown error`, {
      stack: err instanceof Error ? err.stack : undefined,
    });
    return { ok: false, status: 500, message: INTERNAL_ERROR };
  }
  if (err.statusCode >= 500) {
    logger.error(err.message, { code: err.code, statusCode: err.statusCode });
    return { ok: false, status: err.statusCode, message: INTERNAL_ERROR };
  }
  return {
    ok: false,
    status: err.statusCode,
    message: err.message,
    details: err.details as ValidationErrorDetail[] | undefined,
  };
}
