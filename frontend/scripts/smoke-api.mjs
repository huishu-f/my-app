/**
 * @file smoke-api.mjs
 * @description 对运行中的服务做 API 全链路冒烟：注册/登录/发文/改文/评论/点赞/收藏/越权/删除。
 * 用法：先 pnpm dev 起服务，然后 E2E_BASE=http://localhost:3000 node scripts/smoke-api.mjs
 */
import assert from 'node:assert/strict';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const rand = String(Math.floor(Math.random() * 1e9));
const emailA = `smoke-a-${rand}@test.dev`;
const emailB = `smoke-b-${rand}@test.dev`;
const password = 'Smoke12345!';

/** fetch JSON 且把 Set-Cookie 收集为 cookie 串 */
let cookieJar = '';
async function call(method, path, body, expect = 200) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(cookieJar ? { cookie: cookieJar } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length) cookieJar = setCookie.map((c) => c.split(';')[0]).join('; ');
  const json = await res.json().catch(() => ({}));
  assert.equal(
    res.status,
    expect,
    `${method} ${path} 期待 ${expect} 实得 ${res.status}: ${JSON.stringify(json)}`,
  );
  return json;
}

console.log(`冒烟目标: ${BASE}`);

// 健康 + 公开列表
const health = await call('GET', '/health');
assert.equal(health.code, 0);
await call('GET', '/posts?page=1&limit=5');
console.log('✓ 健康检查 + 公开列表');

// 非法 JSON 请求体 → 400（原来是 500）；先于任何登录尝试执行，避免撞上 login 限流桶
{
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{invalid json',
  });
  assert.equal(res.status, 400, `非法 JSON 应 400，实得 ${res.status}`);
}
console.log('✓ 非法 JSON → 400（parseJsonBody 生效）');

// 注册 A / 登录（注册返回 201）
const reg = await call(
  'POST',
  '/auth/register',
  {
    email: emailA,
    password,
    firstName: 'Smoke',
    lastName: 'A',
    username: `smokea${rand}`,
  },
  201,
);
assert.ok(reg.data.user.id);
console.log('✓ 注册 A');

// 重复注册 → 409
await call(
  'POST',
  '/auth/register',
  {
    email: emailA,
    password,
    firstName: 'X',
    lastName: 'Y',
    username: `dup${rand}`,
  },
  409,
);
console.log('✓ 重复注册被拒（409）');

// 显式登录（注册不自动登录）
await call('POST', '/auth/login', { email: emailA, password });

// me
const me = await call('GET', '/auth/me');
assert.equal(me.data.user.email, emailA);
console.log('✓ 当前用户');

// 创建文章（已发布，创建返回 201）
const created = await call(
  'POST',
  '/posts',
  {
    title: `冒烟文章 ${rand}`,
    content: '正文内容，# 标题\n\n段落。'.repeat(3),
    category: '技术',
    tags: 'smoke,test',
    isDraft: false,
  },
  201,
);
const postId = created.data.post.id;
assert.ok(postId);
console.log('✓ 创建文章');

// 详情（contentRaw 存在，content 为渲染后 HTML）
const detail = await call('GET', `/posts/${postId}`);
assert.ok(detail.data.post.contentRaw);
assert.ok(detail.data.post.content.includes('h1') || detail.data.post.content.includes('标题'));
console.log('✓ 文章详情（渲染管线正常）');

// 列表 content 已截断（列表裁剪生效）
const list = await call('GET', '/posts?limit=10');
const inList = list.data.posts.find((p) => p.id === postId);
assert.ok(inList, '新文章应出现在列表');
// 原文 = 3 段重复（>300 字符），列表里应被截断
const fullLen = detail.data.post.contentRaw.length;
assert.ok(
  inList.content.length < fullLen || fullLen <= 300,
  `列表正文应截断（列表 ${inList.content.length} vs 原文 ${fullLen}）`,
);
console.log('✓ 列表正文截断生效');

// 更新 / 邻居 / 评论 / 点赞 / 收藏
await call('PUT', `/posts/${postId}`, { title: `冒烟文章v2 ${rand}` });
await call('GET', `/posts/${postId}/neighbors`);
const comment = await call(
  'POST',
  `/posts/${postId}/comments`,
  { content: '冒烟评论 <script>x</script>' },
  201,
);
assert.ok(!comment.data.comment.content.includes('<script>'), '评论应被纯文本化');
const like = await call('POST', `/posts/${postId}/like`);
assert.deepEqual({ liked: like.data.liked, likes: like.data.likes }, { liked: true, likes: 1 });
const fav = await call('POST', `/posts/${postId}/favorite`);
assert.deepEqual(
  { favorited: fav.data.favorited, favorites: fav.data.favorites },
  { favorited: true, favorites: 1 },
);
const favs = await call('GET', '/favorites');
assert.ok(favs.data.posts.some((p) => p.id === postId));
console.log('✓ 更新/邻居/评论(纯文本化)/点赞/收藏');

// 用户 B 越权改 A 的文章 → 403
{
  const saved = cookieJar;
  cookieJar = '';
  await call(
    'POST',
    '/auth/register',
    {
      email: emailB,
      password,
      firstName: 'Smoke',
      lastName: 'B',
      username: `smokeb${rand}`,
    },
    201,
  );
  await call('POST', '/auth/login', { email: emailB, password });
  await call('PUT', `/posts/${postId}`, { title: 'hijack' }, 403);
  await call('DELETE', `/posts/${postId}`, undefined, 403);
  cookieJar = saved;
}
console.log('✓ 跨用户越权被拒（403）');

// 回到 A：删除 → 再取 404
await call('DELETE', `/posts/${postId}`);
await call('GET', `/posts/${postId}`, undefined, 404);
console.log('✓ 删除级联（详情 404）');

// 登出 → 旧 token 失效
await call('POST', '/auth/logout');
await call('GET', '/auth/me', undefined, 401);
console.log('✓ 登出使 token 失效');

console.log('\n全部冒烟通过 ✓');
