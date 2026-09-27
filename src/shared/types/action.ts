import type { ValidationErrorDetail } from "./ui";

/**
 * Server Action 的统一响应契约：server 侧（toFailure）产出、client 侧（unwrap）消费。
 * 两端共用的类型必须住在 @shared，任何一端单独持有都会造成跨层依赖。
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; details?: ValidationErrorDetail[] };
