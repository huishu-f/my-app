// 通过 Neon HTTP(443) 通道应用 prisma/migrations 并登记 _prisma_migrations。
//
// 为什么存在：本机网络到 Neon 的 TCP 5432 不通，`prisma migrate deploy` 直接 P1001；
// 而应用运行时走的就是 Neon HTTP adapter（443 可达），migrate 只是没走这条路。
// 网络恢复后可以回到官方 `prisma migrate deploy`，两边共用同一套 migration 文件
// 与 _prisma_migrations 记录（checksum 与 Prisma 一致：sha256 of migration.sql）。
//
// 用法：node scripts/migrate-http.mjs
//
// 基线说明：本仓库历史上有段时间用 db push 建库，_prisma_migrations 曾不存在。
// 脚本在「表不存在 + User 表已存在」时会把 0_init 登记为已应用（不执行建表），
// 等效于 `prisma migrate resolve --applied 0_init`。
//
// ponytail: HTTP 模式不支持交互式事务，migration 内的多条语句非原子 ——
// 中途失败需要人工判断已执行到哪条。DDL 每条语句自身是原子的，风险可接受。

import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadDatabaseUrl() {
  const text = readFileSync(join(root, ".env.local"), "utf8");
  const m = text.match(/^DATABASE_URL=(.*)$/m);
  if (!m) throw new Error("DATABASE_URL not found in .env.local");
  return m[1].trim().replace(/^["']|["']$/g, "");
}

const sql = neon(loadDatabaseUrl());

// 与 schema-engine 二进制内嵌的 Postgres 版 DDL 完全一致。
const MIGRATIONS_DDL = `CREATE TABLE _prisma_migrations (
    id                      VARCHAR(36) PRIMARY KEY NOT NULL,
    checksum                VARCHAR(64) NOT NULL,
    finished_at             TIMESTAMPTZ,
    migration_name          VARCHAR(255) NOT NULL,
    logs                    TEXT,
    rolled_back_at          TIMESTAMPTZ,
    started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_steps_count     INTEGER NOT NULL DEFAULT 0
);`;

/** 按 ";行尾" 切语句、剥掉独立成行的注释，空块丢弃。 */
function splitStatements(text) {
  return text
    .split(/;[\r\n]+/)
    .map((chunk) =>
      chunk
        .split(/[\r\n]+/)
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter((s) => s.length > 0);
}

async function tableExists(name) {
  const rows =
    await sql`SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ${name} LIMIT 1`;
  return rows.length > 0;
}

async function isRegistered(name) {
  const rows = await sql`SELECT 1 FROM _prisma_migrations WHERE migration_name = ${name} AND finished_at IS NOT NULL LIMIT 1`;
  return rows.length > 0;
}

async function register(name, checksum) {
  await sql`INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count)
            VALUES (${randomUUID()}, ${checksum}, now(), ${name}, 1)`;
}

async function main() {
  let migrationsTableExisted = await tableExists("_prisma_migrations");
  if (!migrationsTableExisted) {
    // 注意：http 模式下动态 SQL 必须走 sql.query() —— sql.unsafe() 只是构造查询对象，不会执行。
    await sql.query(MIGRATIONS_DDL);
    console.log("Created _prisma_migrations (first run on a db push era database).");
  }

  const migrationsDir = join(root, "prisma", "migrations");
  const names = readdirSync(migrationsDir)
    .filter((d) => /^\d+_/.test(d))
    .sort();

  for (const name of names) {
    if (await isRegistered(name)) {
      console.log(`= ${name} (already applied)`);
      continue;
    }

    const file = join(migrationsDir, name, "migration.sql");
    const raw = readFileSync(file, "utf8");
    const checksum = createHash("sha256").update(raw, "utf8").digest("hex");

    // 基线：库是 db push 建出来的、表已存在，0_init 只登记不执行。
    if (name === "0_init" && (await tableExists("User"))) {
      await register(name, checksum);
      console.log(`~ ${name} (baseline registered, statements skipped)`);
      continue;
    }

    const statements = splitStatements(raw);
    for (const stmt of statements) {
      await sql.query(stmt);
    }
    await register(name, checksum);
    console.log(`+ ${name} (${statements.length} statements)`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
