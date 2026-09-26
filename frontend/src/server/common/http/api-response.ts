import "server-only";
import { NextResponse } from "next/server";
import { isAppError, InternalServerError } from "@server/common/errors";
import { logger } from "@server/common/logger";

export function sendSuccess<T>(
  data: T,
  message = "Operation successful",
  status = 200,
  init?: { headers?: Record<string, string> },
): NextResponse {
  return NextResponse.json({ code: 0, data, message }, { status, headers: init?.headers });
}

export function sendError(err: unknown): NextResponse {
  const appError = isAppError(err)
    ? err
    : new InternalServerError(err instanceof Error ? err.message : "Internal server error");

  if (appError.statusCode >= 500) {
    logger.error(appError.message, {
      code: appError.code,
      statusCode: appError.statusCode,
      stack: err instanceof Error ? err.stack : undefined,
    });
  } else {
    logger.warn(appError.message, { code: appError.code, statusCode: appError.statusCode });
  }

  const message =
    appError.statusCode >= 500 ? "Internal server error, please try again later" : appError.message;

  return NextResponse.json(
    {
      code: appError.statusCode,
      data: null,
      message,
      ...(appError.statusCode < 500 && appError.details ? { details: appError.details } : {}),
    },
    { status: appError.statusCode },
  );
}
