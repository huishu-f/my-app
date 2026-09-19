/**
 * @file post.ts
 * @description 文章写操作的 Server Action：新建/更新/删除文章，并在同一次服务端往返内完成缓存失效
 *
 * 为什么文章的「写」走 Server Action 而不是复用 Route Handler：
 * Route Handler 里的 revalidateTag 只清服务端 Data/Full Route Cache，清不掉浏览器 Client Cache
 * （staleTimes.static 默认 5 分钟），作者删/改完再回列表会命中旧 RSC 快照，看着像「没删掉」；
 * 而 Server Action 内的重验证会把 Client Cache 一并清掉，且「变更 + 失效 + 重渲染」在同一次往返内完成
 * （见官方 revalidatePath 文档的 purge the Client Cache 与 server-actions 指南的 single roundtrip）。
 *
 * 边界：只承担同源 UI 的写路径。/api/posts 仍是对外数据接口，两者共用同一 blogService，
 * 业务规则只有一份；这个文件不复制 service 逻辑，只补「鉴权入口 + 缓存失效 + 可序列化错误」。
 *
 * 公共骨架（结果契约 / 失败收敛 / 限流守卫 / 鉴权变更失效）在 `./run`，本文件只保留
 * 文章域的三个动作与它们各自的校验与失效语义。
 */
'use server';

import { getContainer } from '@my-app/backend/container';
import { NotFoundError } from '@my-app/backend/errors';
import {
  parseCreatePostBody,
  parseUpdatePostBody,
} from '@my-app/backend/modules/blog/blog-validators';
import { POST_CREATE_RATE_LIMIT } from '@/server/rate-limit-policy';
import { rateLimitFailure, runMutation, type ActionResult } from '@/actions/run';
import type { CreatePostDto, PostData, UpdatePostDto } from '@my-app/shared';

/**
 * 新建文章，作者取自登录态而非入参
 * @param input 文章创建数据，服务端按与 API 同一套 schema 校验
 * @returns 成功返回 { post }；未登录 401、参数非法 400、封面图非白名单图床 422、发布过频 429
 */
export async function createPostAction(input: CreatePostDto): Promise<ActionResult<PostData>> {
  // 与 POST /api/posts 共用同一份限流策略（含同一计数键）：改用 Server Action 后不能丢掉发布频次保护
  // （Server Action 是可直接 POST 的入口，不能把它当作「只有 UI 能调」）
  const limited = await rateLimitFailure(POST_CREATE_RATE_LIMIT);
  if (limited) return limited;

  return runMutation(async (user) => {
    const dto = parseCreatePostBody(input);
    const { blogService } = getContainer();
    const post = await blogService.createPost({ ...dto, authorId: user.id });
    // 新建会改变全量列表与分类/标签聚合，不传 postId（无可精确失效的旧文章）
    return { data: { post } };
  });
}

/**
 * 更新文章（仅作者本人）
 * @param id 文章 id
 * @param input 待更新字段，服务端按与 API 同一套 schema 校验
 * @returns 成功返回更新后的 { post }；未登录 401、文章不存在 404、非作者 403、参数非法 400
 */
export async function updatePostAction(
  id: string,
  input: UpdatePostDto,
): Promise<ActionResult<PostData>> {
  return runMutation(async (user) => {
    const postId = id?.trim();
    if (!postId) throw new NotFoundError('文章不存在');

    const dto = parseUpdatePostBody(input);
    const { blogService } = getContainer();
    const post = await blogService.updatePost(postId, dto, user.id);
    return { data: { post }, postId };
  });
}

/**
 * 删除文章（仅作者本人），service 层会级联清理该文章的评论与用户的点赞/收藏记录
 * @param id 文章 id
 * @returns 成功返回 data 为 null；未登录 401、文章不存在 404、非作者 403
 */
export async function deletePostAction(id: string): Promise<ActionResult<null>> {
  return runMutation(async (user) => {
    const postId = id?.trim();
    if (!postId) throw new NotFoundError('文章不存在');

    const { blogService } = getContainer();
    await blogService.deletePost(postId, user.id);
    return { data: null, postId };
  });
}
