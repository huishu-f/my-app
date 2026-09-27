import type { ValidationErrorDetail } from "../ui";

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,

    public readonly code: number,
    message: string,

    public readonly details?: ValidationErrorDetail[],
  ) {
    super(message);
    this.name = "ApiRequestError";
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }
}
