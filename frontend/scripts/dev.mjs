#!/usr/bin/env node
/**
 * @file 开发启动编排脚本
 * @description 开发环境启动前的准备工作与 next dev 托管：
 *              1. 清理 NODE_ENV（外部环境可能误设 production）
 *              2. 清理 .next/cache/fetch-cache
 *              3. 释放 DEV_PORT 上的残留进程，避免"端口被占用"
 *              4. 启动 next dev（透传参数、信号与输出）
 *
 * 用法：
 *   pnpm dev            — 完整启动（清缓存 + 释放端口 + next dev）
 *   pnpm dev:free-port  — 仅释放端口后退出（不启动 dev server）
 */
import { execSync, spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const PORT = Number(process.env.DEV_PORT || process.env.PORT || 3000);
const freePortOnly = process.argv.includes('--free-port-only');

/* ── 0. 清理 NODE_ENV — 外部环境可能设了 production，导致 next dev 行为异常（CSP 不加 unsafe-eval 等） ── */
delete process.env.NODE_ENV;

/* ── 1. 清理 fetch-cache ── */
try {
  rmSync(path.join(root, '.next/cache/fetch-cache'), { recursive: true, force: true });
} catch {
  /* 目录不存在时静默跳过 */
}

/* ── 2. 释放端口上的残留进程 ── */

/**
 * 查询占用指定端口的进程 PID 列表
 * @param port 端口号
 * @returns 占用该端口的进程 PID 数组；查询失败或端口空闲返回空数组
 * @description 跨平台实现：Windows 用 netstat，其余平台用 lsof。
 *              始终排除自身 PID
 */
function pidsOnPort(port) {
  if (process.platform === 'win32') {
    try {
      const out = execSync('netstat -ano', { encoding: 'utf8' });
      const pids = new Set();
      const re = new RegExp(`:${port}\\s`);
      for (const line of out.split('\n')) {
        const t = line.trim();
        // 只匹配处于 LISTENING 状态的 TCP 条目，避免误杀仅作为客户端连接过该端口的进程
        if (t.startsWith('TCP') && re.test(t) && /LISTENING/i.test(t)) {
          const pid = Number(t.split(/\s+/).pop());
          if (Number.isInteger(pid) && pid > 0 && pid !== process.pid) pids.add(pid);
        }
      }
      return [...pids];
    } catch {
      return [];
    }
  }
  try {
    const out = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' });
    return out
      .split('\n')
      .map(Number)
      .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
  } catch {
    /* lsof 无输出（端口空闲）时抛非零退出码，属正常 */
    return [];
  }
}

const stale = pidsOnPort(PORT);
if (stale.length > 0) {
  console.log(`[dev] 端口 ${PORT} 被残留进程占用（PID: ${stale.join(', ')}），正在清理...`);
  for (const pid of stale) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      } else {
        process.kill(pid, 'SIGKILL');
      }
    } catch {
      /* 进程已自行退出则跳过 */
    }
  }
  console.log(`[dev] 端口 ${PORT} 已释放`);
} else if (freePortOnly) {
  console.log(`[dev] 端口 ${PORT} 当前空闲，无需处理`);
}

if (freePortOnly) process.exit(0);

/* ── 3. 启动 next dev ── */
const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');
// 透传本脚本之后的参数（如 --turbo / -p 3001），剔除内部参数
const passthrough = process.argv.slice(2).filter((a) => a !== '--free-port-only');

const child = spawn(process.execPath, [nextBin, 'dev', ...passthrough], {
  stdio: 'inherit',
  env: { ...process.env, PORT: String(PORT) },
});

// 透传终止信号，保证 Ctrl+C 能连带停掉 dev server
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => child.kill(sig));
}
child.on('close', (code) => process.exit(code ?? 0));
