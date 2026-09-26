import { defineRoute, requireId } from "@server/common/http/route-handler";
import { sendSuccess } from "@server/common/http/api-response";
import { listComments } from "@server/comment/comment.service";

function parsePositiveInt(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export const GET = defineRoute<{ id: string }>(
  async ({ auth, params, request }) => {
    const postId = requireId(params);
    const search = new URL(request.url).searchParams;

    const data = await listComments({
      postId,
      user: auth ?? undefined,
      limit: parsePositiveInt(search.get("limit")),
      offset: parsePositiveInt(search.get("offset")),
    });

    return sendSuccess(data, "获取成功");
  },
  { auth: "optional" },
);
