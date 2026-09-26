#!/usr/bin/env node
/**
 * strip-comments.mjs
 * 删除项目源码注释，保留指令性注释（eslint-disable / eslint-enable / @ts- / ponytail:）。
 *
 * 用法：
 *   node scripts/strip-comments.mjs          # 全量执行
 *   node scripts/strip-comments.mjs --check  # 只扫描，不写回
 *   node scripts/strip-comments.mjs <path>   # 针对单个文件/目录
 *
 * 范围：frontend/src 下所有 ts/tsx/js/jsx/mjs/mts/css，以及 shared 下 index.ts、types、validation 目录
 * 排除：node_modules、.next、.git
 *
 * 实现说明：手写状态机扫描注释，正确处理字符串/模板字面量/正则字面量内的伪注释，
 * 不依赖任何第三方包。JSX 的花括号包裹块注释，按表达式容器内的块注释处理，自然被删除。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "..");
const MONOREPO_ROOT = path.resolve(FRONTEND_DIR, "..");

// ---------- 配置 ----------
const KEEP_PREFIXES = ["eslint-disable", "eslint-enable", "@ts-", "ponytail:"];

function blockCommentBodyHasKeepDirective(raw) {
  const body = raw.replace(/^\/\*+/, "").replace(/\*+\/$/, "");
  const lines = body.split(/\r?\n/);
  for (const ln of lines) {
    const trimmed = ln.replace(/^\s*\*/, "").trim();
    if (!trimmed) continue;
    if (KEEP_PREFIXES.some((p) => trimmed.startsWith(p))) return true;
  }
  return false;
}

function lineCommentTextHasKeepDirective(text) {
  // text: 已去掉 "//" 与前导空白
  return KEEP_PREFIXES.some((p) => text.startsWith(p));
}

// ---------- JS/TS 注释扫描器 ----------
// 返回要删除的注释区间数组 [{start, end, isBlock}]
function scanJsComments(src) {
  const ranges = [];
  let i = 0;
  const n = src.length;

  // 跟踪前一个有意义 token，用于判断 / 是除号还是正则字面量起始
  // prevSig: 上一个非空白字符及其前的关键字信息
  let prevSig = null; // 字符
  const isRegexStart = () => {
    if (prevSig === null) return true;
    // 若前一个有意义字符是标识符/数字/)/]/"，则 / 是除号；否则可能是正则
    return !/[A-Za-z0-9_$)\]'"`]/.test(prevSig);
  };

  while (i < n) {
    const ch = src[i];

    // 行注释
    if (ch === "/" && src[i + 1] === "/") {
      const start = i;
      let j = i + 2;
      // 行注释到行尾（不包含换行）
      while (j < n && src[j] !== "\n" && src[j] !== "\r") j++;
      const text = src.slice(start + 2, j).trimStart();
      if (!lineCommentTextHasKeepDirective(text)) {
        ranges.push({ start, end: j, isBlock: false });
      }
      i = j;
      continue;
    }

    // 块注释
    if (ch === "/" && src[i + 1] === "*") {
      const start = i;
      let j = i + 2;
      while (j < n && !(src[j] === "*" && src[j + 1] === "/")) j++;
      j = Math.min(j + 2, n); // 跳过 */，到文件尾则夹紧
      const raw = src.slice(start, j);
      if (!blockCommentBodyHasKeepDirective(raw)) {
        ranges.push({ start, end: j, isBlock: true });
      }
      i = j;
      prevSig = "/";
      continue;
    }

    // 字符串：单引号、双引号
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < n) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === quote) {
          j++;
          break;
        }
        if (src[j] === "\n" && quote !== "`") {
          // 单/双引号不允许跨行；但容错处理：遇到换行就结束（防止吃到下一行）
          break;
        }
        j++;
      }
      i = j;
      prevSig = quote;
      continue;
    }

    // 模板字符串 `...`（支持嵌套 ${...}）
    if (ch === "`") {
      let j = i + 1;
      let depth = 0;
      while (j < n) {
        const c = src[j];
        if (c === "\\") {
          j += 2;
          continue;
        }
        if (c === "$" && src[j + 1] === "{") {
          depth++;
          j += 2;
          continue;
        }
        if (c === "}" && depth > 0) {
          depth--;
          j++;
          continue;
        }
        if (c === "`" && depth === 0) {
          j++;
          break;
        }
        j++;
      }
      i = j;
      prevSig = "`";
      continue;
    }

    // 正则字面量（粗略）：仅当上下文表明 / 是正则起始时才进入
    if (ch === "/" && isRegexStart()) {
      let j = i + 1;
      let inClass = false; // [..] 字符类
      while (j < n) {
        const c = src[j];
        if (c === "\\") {
          j += 2;
          continue;
        }
        if (c === "[") inClass = true;
        else if (c === "]") inClass = false;
        else if (c === "/" && !inClass) {
          j++;
          // 跳过 flags
          while (j < n && /[gimsuy]/.test(src[j])) j++;
          break;
        }
        if (c === "\n") break; // 正则不跨行
        j++;
      }
      i = j;
      prevSig = "/";
      continue;
    }

    // 其他字符
    if (!/\s/.test(ch)) prevSig = ch;
    i++;
  }

  return ranges;
}

// ---------- CSS 注释扫描器 ----------
function scanCssComments(src) {
  const ranges = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    // CSS 字符串：content: "..."、url('...') 等
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < n) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === quote) {
          j++;
          break;
        }
        if (src[j] === "\n") break;
        j++;
      }
      i = j;
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      const start = i;
      let j = i + 2;
      while (j < n && !(src[j] === "*" && src[j + 1] === "/")) j++;
      j = Math.min(j + 2, n);
      const raw = src.slice(start, j);
      if (!blockCommentBodyHasKeepDirective(raw)) {
        ranges.push({ start, end: j, isBlock: true });
      }
      i = j;
      continue;
    }
    i++;
  }
  return ranges;
}

// ---------- 应用删除 + 整理空行 ----------
function applyRanges(src, ranges) {
  if (ranges.length === 0) return src;
  ranges.sort((a, b) => b.start - a.start);
  let out = src;
  for (const r of ranges) {
    out = out.slice(0, r.start) + out.slice(r.end);
  }
  return collapseBlankLines(out);
}

function collapseBlankLines(src) {
  // 先清理 JSX 注释删除后留下的空表达式容器 {}
  // 仅清理独占一行的 {}（前后只有空白），避免误伤对象字面量/解构等
  src = src.replace(/^[ \t]*\{\}[ \t]*$/gm, "");
  const lines = src.split(/\r?\n/);
  const result = [];
  let blankRun = 0;
  for (const ln of lines) {
    if (ln.trim() === "") {
      blankRun++;
      continue;
    }
    if (blankRun > 0 && result.length > 0) {
      result.push("");
    }
    blankRun = 0;
    result.push(ln);
  }
  while (result.length > 0 && result[result.length - 1].trim() === "") result.pop();
  return result.length === 0 ? "" : result.join("\n") + "\n";
}

// ---------- 文件遍历 ----------
const EXT_LANG = {
  ".ts": "js",
  ".tsx": "js",
  ".js": "js",
  ".jsx": "js",
  ".mjs": "js",
  ".mts": "js",
  ".cjs": "js",
  ".css": "css",
};

function walk(dir, files) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next" || e.name === ".git") continue;
      walk(p, files);
    } else if (e.isFile()) {
      const ext = path.extname(p);
      if (ext in EXT_LANG) files.push(p);
    }
  }
}

function collectRoots(checkPath) {
  if (checkPath) {
    return [path.resolve(MONOREPO_ROOT, checkPath)];
  }
  return [
    path.join(FRONTEND_DIR, "src"),
    path.join(MONOREPO_ROOT, "shared", "index.ts"),
    path.join(MONOREPO_ROOT, "shared", "types"),
    path.join(MONOREPO_ROOT, "shared", "validation"),
    path.join(MONOREPO_ROOT, "shared", "eslint.config.mjs"),
  ];
}

function collectFiles(roots) {
  const files = [];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    const stat = fs.statSync(r);
    if (stat.isDirectory()) {
      walk(r, files);
    } else if (stat.isFile()) {
      files.push(r);
    }
  }
  return files;
}

// ---------- 主逻辑 ----------
function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const positional = args.filter((a) => !a.startsWith("--"));
  const roots = collectRoots(positional[0]);
  const files = collectFiles(roots);

  let changed = 0;
  let untouched = 0;
  let totalRangesRemoved = 0;

  for (const file of files) {
    const ext = path.extname(file);
    const lang = EXT_LANG[ext];
    if (!lang) continue;
    const src = fs.readFileSync(file, "utf8");
    const ranges = lang === "css" ? scanCssComments(src) : scanJsComments(src);
    const stripped = applyRanges(src, ranges);

    totalRangesRemoved += ranges.length;

    if (stripped !== src) {
      changed++;
      if (!checkOnly) fs.writeFileSync(file, stripped, "utf8");
    } else {
      untouched++;
    }
  }

  console.log(`\n=== strip-comments ${checkOnly ? "[check mode]" : "[write mode]"} ===`);
  console.log(`扫描文件数: ${files.length}`);
  console.log(`改动文件数: ${changed}`);
  console.log(`未改动文件数: ${untouched}`);
  console.log(`删除注释块数: ${totalRangesRemoved}`);
  if (checkOnly) {
    console.log(`\n提示：去掉 --check 参数执行写入。`);
  } else {
    console.log(`\n下一步建议：pnpm typecheck && pnpm lint && pnpm build`);
  }
}

main();
