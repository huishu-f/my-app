import type { ValidationErrorDetail } from "@my-app/shared";

const APP_ERROR_BRAND = Symbol.for("my-app/app-error");

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: ValidationErrorDetail[],
  ) {
    super(message);
    this.name = this.constructor.name;

    Object.defineProperty(this, APP_ERROR_BRAND, { value: true });
  }
}

export function isAppError(err: unknown): err is AppError {
  if (err instanceof AppError) return true;
  if (typeof err !== "object" || err === null) return false;
  return (err as unknown as Record<symbol, unknown>)[APP_ERROR_BRAND] === true;
}

export function isAppErrorWithStatus(err: unknown, statusCode: number): err is AppError {
  return isAppError(err) && err.statusCode === statusCode;
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized, please log in first") {
    super(401, "Unauthorized", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, "Forbidden", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, "NotFound", message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super(409, "Conflict", message);
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Internal server error") {
    super(500, "InternalServerError", message);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Request validation failed", details?: ValidationErrorDetail[]) {
    super(400, "ValidationError", message, details);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = "Request content is invalid", details?: ValidationErrorDetail[]) {
    super(422, "UnprocessableEntity", message, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests, please try again later") {
    super(429, "RateLimitError", message);
  }
}
