const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const nextDir = path.join(__dirname, "..", ".next");
const appDir = path.join(nextDir, "server", "app");

const ZOD_MARKERS = [/invalid_type/g, /ZodError/g, /\$ZodType/g];

function zodHits(buf) {
  const t = buf.toString("utf8");
  let n = 0;
  for (const re of ZOD_MARKERS) n += (t.match(re) || []).length;
  return n;
}

function readChunk(url) {
  try {
    return fs.readFileSync(path.join(nextDir, url.replace(/^\/_next\//, "")));
  } catch {
    return null;
  }
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const referenced = new Set();
for (const f of walk(appDir)) {
  let txt;
  try {
    txt = fs.readFileSync(f, "utf8");
  } catch {
    continue;
  }
  for (const m of txt.matchAll(/_next\/static\/chunks\/[A-Za-z0-9_.-]+\.js/g)) {
    referenced.add("/" + m[0]);
  }
}

console.log("被当前构建引用的 client chunk 数:", referenced.size);

const offenders = [];
let raw = 0;
let gz = 0;
for (const u of referenced) {
  const b = readChunk(u);
  if (!b) continue;
  raw += b.length;
  gz += zlib.gzipSync(b).length;
  const n = zodHits(b);
  if (n > 0) offenders.push([u.replace("/_next/static/chunks/", ""), b.length, n]);
}

console.log("被引用 chunk 总 raw :", (raw / 1024).toFixed(0) + "KB");
console.log("被引用 chunk 总 gzip:", (gz / 1024).toFixed(0) + "KB");
console.log(
  "含 zod 的被引用 chunk:",
  offenders.length ? JSON.stringify(offenders, null, 1) : "无 ✅",
);

const htmlPath = path.join(appDir, "en.html");
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const scripts = [...new Set([...html.matchAll(/<script[^>]+src="(\/_next\/[^"]+)"/g)].map((m) => m[1]))];
  let sr = 0;
  let sg = 0;
  let sz = 0;
  for (const u of scripts) {
    const b = readChunk(u);
    if (b) {
      sr += b.length;
      sg += zlib.gzipSync(b).length;
      sz += zodHits(b);
    }
  }
  console.log("");
  console.log("=== 首页 /en ===");
  console.log("html          :", (html.length / 1024).toFixed(1) + "KB");
  console.log("script 数     :", scripts.length);
  console.log("首屏 JS raw   :", (sr / 1024).toFixed(0) + "KB");
  console.log("首屏 JS gzip  :", (sg / 1024).toFixed(0) + "KB");
  console.log("zod 指纹命中  :", sz);
  const flight = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)].map((m) => m[1]).join("");
  console.log("RSC 载荷      :", (flight.length / 1024).toFixed(1) + "KB");
}

const leftover = path.join(nextDir, "static/chunks/3fuu8osk0ivd6.js");
console.log("");
console.log(
  "上一版 zod chunk 是否仍留在磁盘（未被引用即无害）:",
  fs.existsSync(leftover) ? "是（增量构建残留）" : "已消失",
);
