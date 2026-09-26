import { NextResponse } from "next/server";
import { sendSuccess } from "@server/common/http/api-response";
import { logger } from "@server/common/logger";
import { getPrisma } from "@/lib/prisma/db";

export async function GET() {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
  } catch (err) {
    // ponytail: 不回显原始 DB 错误。Prisma 的连接类报错常带主机名、端口、库名，
    // 而这是一个匿名可访问、无限流的接口 —— 等于把可用性拓扑和侦察线索送出去。
    // 详情只进日志，响应体保持最小。
    logger.error("Health check failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ code: 503, data: null, message: "Service unavailable" }, {
      status: 503,
    });
  }

  return sendSuccess({ status: "ok" }, "OK");
}
