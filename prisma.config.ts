import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// CI/生产环境变量由部署平台（EdgeOne）后台注入，不走 dotenv；
// 本地开发只有 .env.local，需显式指定路径。
if (process.env.NODE_ENV !== "production") {
  config({ path: ".env.local" });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
