/**
 * @file actions.ts
 * @description 文章写操作的客户端入口：调用 Server Action 并把失败结果还原成 ApiRequestError。
 *
 * 读走 blogApi（HTTP 数据接口），写走本文件（Server Action，带 Client Cache 失效）——
 * 这是刻意的分工，不是两套实现：业务规则都在 blogService，本文件只做「结果 → 错误类型」的适配，
 * 让上层 useAsyncAction / handleApiError 无需感知数据是怎么传到服务端的。
 */
import { ApiRequestError } from '@/lib/api/request';
import { createPostAction, updatePostAction, deletePostAction } from '@server/actions/posts';
import type { ActionResult } from '@server/actions/posts';
import type { CreatePostDto, PostData, UpdatePostDto } from '@my-app/shared';

/**
 * 解包 ActionResult：失败时抛出与 HTTP 接口同构的 ApiRequestError
 * @param result Server Action 返回的判别联合结果
 * @returns 成功时的数据
 * @throws 失败时抛出 ApiRequestError，status 与业务 code 同源（后端错误体 code 即状态码）
 * @template T 成功数据类型
 */
function unwrap<T>(result: ActionResult<T>): T {
  if (result.ok) return result.data;
  throw new ApiRequestError(result.status, result.status, result.message, result.details);
}

/** 文章写操作集合，与 blogApi 的读接口对称；变更经 Server Action 以获得缓存失效语义 */
export const postActions = {
  /**
   * 新建文章
   * @param dto 文章创建数据
   * @returns 创建后的 PostData
   * @throws 未登录、参数非法或发布过频时抛 ApiRequestError
   */
  create: (dto: CreatePostDto) => createPostAction(dto).then(unwrap<PostData>),

  /**
   * 更新文章（仅作者本人）
   * @param id 文章 id
   * @param dto 待更新字段
   * @returns 更新后的 PostData
   * @throws 未登录、无权限或参数非法时抛 ApiRequestError
   */
  update: (id: string, dto: UpdatePostDto) => updatePostAction(id, dto).then(unwrap<PostData>),

  /**
   * 删除文章（仅作者本人）
   * @param id 文章 id
   * @returns null
   * @throws 未登录、无权限或文章不存在时抛 ApiRequestError
   */
  remove: (id: string) => deletePostAction(id).then(unwrap<null>),
};
