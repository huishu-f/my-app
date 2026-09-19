/**
 * @file repair-pnpm-links.mjs
 * @description 环境兜底脚本：修复 pnpm 在 Windows 上把「目录链接」建成空目录的问题。
 *
 * 症状：`pnpm install` 报成功，但 `node_modules/<pkg>` 是**空目录**；模块解析被这个空目录遮蔽而失败，
 *       表现为 `tsc` 的 "Cannot find module" 或 `next build` 的 "Can't resolve 'xyz'"。
 * 做法：扫描各 `node_modules` 下的空包目录，按 `.pnpm` store 里的真实路径重建为 junction
 *       （junction 是 Windows 原生、无需提权的目录链接）。
 *
 * 用法：`node scripts/repair-pnpm-links.mjs`
 * 注意：这是**环境兜底**，不是构建步骤。链接正常的机器上不要跑，也不要挂到 postinstall。
 */
import { readdirSync, lstatSync, existsSync, symlinkSync, rmSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 仓库根目录：由脚本自身位置推导，不硬编码绝对路径 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STORE = path.join(ROOT, 'node_modules', '.pnpm');
const WORKSPACE_PKGS = new Set(['shared', 'backend', 'frontend']);

const SKIP = new Set(['.bin', '.pnpm', '.cache', '.modules.yaml', 'node_modules']);

/** 某名字在 store 中所有「已填充」的候选版本目录 */
function storeCandidates(name) {
  const scope = name.startsWith('@') ? name.split('/')[0] : null;
  const base = scope ? name.split('/')[1] : name;
  const prefix = scope ? `${scope}+${base}@` : `${base}@`;
  const out = [];
  for (const d of readdirSync(STORE)) {
    if (!d.startsWith(prefix)) continue;
    const target = path.join(STORE, d, 'node_modules', name);
    if (!existsSync(target)) continue;
    try {
      if (readdirSync(target).length > 0) out.push({ dir: d, target });
    } catch {
      /* ignore */
    }
  }
  return out;
}

/** 递归找出所有「空的 node_modules 一级/二级条目」 */
function findEmptyDirs(dir, depth, acc) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (SKIP.has(e.name) || e.name.startsWith('.ignored_')) continue;
    const p = path.join(dir, e.name);
    let st;
    try {
      st = lstatSync(p);
    } catch {
      continue;
    }
    if (!st.isDirectory() && !st.isSymbolicLink()) continue;
    if (e.name.startsWith('@')) {
      findEmptyDirs(p, depth + 1, acc);
      continue;
    }
    // 只处理「看起来是包目录」的项：空目录 => 坏链接
    let n = -1;
    try {
      n = readdirSync(p).length;
    } catch {
      n = -1;
    }
    if (n === 0) acc.push(p);
  }
  return acc;
}

const roots = [
  path.join(ROOT, 'node_modules'),
  path.join(ROOT, 'frontend', 'node_modules'),
  path.join(ROOT, 'shared', 'node_modules'),
  path.join(ROOT, 'backend', 'node_modules'),
];

const broken = [];
for (const r of roots) {
  if (existsSync(r)) findEmptyDirs(r, 0, broken);
}
// 递归进 store 里每个包的 node_modules（它们也会出现坏链接）
for (const d of readdirSync(STORE)) {
  if (d === 'node_modules' || d === 'lock.yaml') continue;
  const nm = path.join(STORE, d, 'node_modules');
  if (existsSync(nm)) findEmptyDirs(nm, 0, broken);
}

let fixed = 0;
let unresolved = [];

for (const p of broken) {
  const seg = path.relative(ROOT, p).split(path.sep).join('/').split('/');
  // 从路径里取出包名（支持 @scope/name）
  const rel = seg.join('/');
  const nmIdx = seg.lastIndexOf('node_modules');
  if (nmIdx === -1) continue;
  const rest = seg.slice(nmIdx + 1);
  const name = rest[0].startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0];
  if (!name) continue;

  let target = null;
  const [scope, base] = name.startsWith('@') ? name.split('/') : [null, name];
  if (scope === '@my-app' && WORKSPACE_PKGS.has(base)) {
    target = path.join(ROOT, base);
  } else {
    const cands = storeCandidates(name);
    if (cands.length === 1) target = cands[0].target;
    else if (cands.length > 1) {
      // 多个版本：取版本号最大者（与 pnpm hoist 的取向一致）
      cands.sort((a, b) => {
        const va = a.dir.split('@').pop();
        const vb = b.dir.split('@').pop();
        return vb.localeCompare(va, undefined, { numeric: true });
      });
      target = cands[0].target;
    }
  }

  if (!target || !existsSync(target)) {
    unresolved.push(rel);
    continue;
  }

  try {
    rmSync(p, { recursive: true, force: true });
    symlinkSync(realpathSync(target), p, 'junction');
    fixed++;
  } catch (e) {
    unresolved.push(`${rel} (${e.code})`);
  }
}

console.log(`broken/empty links found : ${broken.length}`);
console.log(`repaired as junctions   : ${fixed}`);
if (unresolved.length) {
  console.log(`unresolved (${unresolved.length}):`);
  for (const u of unresolved.slice(0, 25)) console.log('   -', u);
}
