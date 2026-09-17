#!/usr/bin/env node
/**
 * @file 开发启动编排脚本
 * @description 开发环境启动前的准备工作与 next dev 托管。
 *
 *   Next 16 把 dev 的持久编译缓存与生产构建产物都放进同一个 .next 下（dev 在 .next/dev）。
 *   因此对 .next 整体做 rimraf 有两个致命后果：
 *     1. dev server 正在运行时，.next/dev/cache/turbopack/*.sst 被进程锁住 → EPERM，
 *        rimraf 删到一半即中止，.next 剩下一个"目录还在、manifest 全丢"的残壳；
 *     2. Turbopack 随后发现缓存残缺，会永久关闭本次会话的持久化
 *        （日志：Persisting is disabled for this session），表现为 HMR 静默失效、页面 500。
 *
 *   所以本脚本严格按「先释放端口 → 再清理 → 最后启动」的顺序执行，且默认只清 .next/dev，
 *   绝不触碰生产构建产物。清理顺序不可颠倒：先清后杀时旧进程仍持有文件锁，删除必然半途失败。
 *
 * 用法：
 *   node scripts/dev.mjs                  释放端口 → 清 .next/dev → 启动 next dev
 *   node scripts/dev.mjs --free-port-only  仅释放端口后退出（不启动 dev server）
 *   node scripts/dev.mjs --clean-all       释放端口 → 清整个 .next 后退出（冷构建/冷启动用）
 */
import { execSync, spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const PORT = Number(process.env.DEV_PORT || process.env.PORT || 3000);
const argv = process.argv.slice(2);
const freePortOnly = argv.includes('--free-port-only');
const cleanAll = argv.includes('--clean-all');

/* ── 0. 清理 NODE_ENV — 外部环境可能设了 production，导致 next dev 行为异常（CSP 不加 unsafe-eval 等） ── */
delete process.env.NODE_ENV;

/**
 * 查询占用指定端口的进程 PID 列表
 * @param port 端口号
 * @returns 占用该端口的进程 PID 数组；查询失败或端口空闲返回空数组
 * @description 跨平台实现：Windows 用 netstat，其余平台用 lsof。始终排除自身 PID。
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

/* ── 1. 先释放端口 ──
   必须排在清理之前：残留的 dev server 仍持有 .next 下的文件句柄，先删后杀只会得到半删状态 */
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

/* ── 2. 再清理缓存 ── */
const targets = cleanAll ? ['.next'] : ['.next/dev'];

for (const target of targets) {
  const abs = path.join(root, target);
  try {
    // maxRetries/retryDelay：Windows 上文件句柄释放有延迟，给 Node 内置实现几次退避重试的机会
    rmSync(abs, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    console.log(`[dev] 已清理 ${target}`);
  } catch (err) {
    // 不能静默吞掉：缓存残缺会让 Turbopack 关闭本次会话的持久化，HMR 会不可靠。
    // 这里只告警不终止，让启动继续，但把原因打出来便于定位。
    console.warn(
      `[dev] 清理 ${target} 失败（${err?.code ?? 'UNKNOWN'}）：${err?.message ?? err}\n` +
        `[dev] 请确认没有其它 dev server / next start 正在运行；HMR 若异常，重启 dev 即可恢复`,
    );
  }
}

if (cleanAll) process.exit(0);

/* ── 3. 启动 next dev ── */
const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');
// 透传本脚本之后的参数（如 --turbo / -p 3001），剔除内部参数
const passthrough = argv.filter((a) => a !== '--free-port-only' && a !== '--clean-all');

const child = spawn(process.execPath, [nextBin, 'dev', ...passthrough], {
  stdio: 'inherit',
  env: { ...process.env, PORT: String(PORT) },
});

// 透传终止信号，保证 Ctrl+C 能连带停掉 dev server
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => child.kill(sig));
}
child.on('close', (code) => process.exit(code ?? 0));
