import "server-only";

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { env } from "@server/common/config/env";

const globalForPrisma = globalThis as unknown as {
  __prisma?: PrismaClient;
};

export const getPrisma = (): PrismaClient => {
  // 单例必须与环境无关：生产环境（Netlify Lambda 常驻复用）若每次调用都 new，
  // 每个实例都会泄漏一个 adapter + 连接池，几十次请求后即打满 Neon 连接数。
  if (globalForPrisma.__prisma) return globalForPrisma.__prisma;

  const adapter = new PrismaNeon({
    connectionString: env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });
  globalForPrisma.__prisma = prisma;
  return prisma;
};
