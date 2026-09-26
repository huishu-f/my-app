import { defineRoute, requireId } from "@server/common/http/route-handler";
import { sendSuccess } from "@server/common/http/api-response";
import { isRateLimited, getClientIp } from "@server/common/rate-limit";
import { incrementView } from "@server/blog/blog.service";

export const POST = defineRoute<{ id: string }>(async ({ request, params }) => {
  const id = requireId(params);

  const ip = getClientIp(request);

  if (await isRateLimited(`view:${id}:${ip}`, 30, 5 * 60_000)) {
    return sendSuccess(null, "已记录");
  }

  await incrementView(id);
  return sendSuccess(null, "已记录");
});
