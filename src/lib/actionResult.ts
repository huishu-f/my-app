import { ApiRequestError } from "@/lib/apiRequest";
import type { ActionResult } from "@server/common/action-result";

export function unwrap<T>(result: ActionResult<T>): T {
  if (result.ok) return result.data;
  throw new ApiRequestError(result.status, result.status, result.message, result.details as never);
}
