/**
 * @file unwrap.ts
 * @description Server Action 结果的唯一解包器：把 ActionResult 还原成「成功值 / 抛 ApiRequestError」，全仓只此一份。
 *
 * 为什么必须单独一个文件：`'use server'` 文件的导出会被编译成服务端引用，不能当普通函数在客户端调用；
 * 而解包是纯客户端行为，因此不能塞进 `actions/post.ts` 这类 `'use server'` 模块。
 *
 * 抛出的 ApiRequestError 与 HTTP 请求层（`@/lib/request`）同构，
 * 所以上层 `err instanceof ApiRequestError` 的分支在「读走 HTTP、写走 Action」之间无需区分。
 */
import { ApiRequestError } from '@/lib/request';
import type { ActionResult } from '@/actions/run';

/**
 * 解包 ActionResult：失败时抛出与 HTTP 接口同构的 ApiRequestError
 * @param result Server Action 返回的判别联合结果
 * @returns 成功时的数据
 * @throws 失败时抛出 ApiRequestError，status 与业务 code 同源（后端错误体 code 即状态码）
 * @template T 成功数据类型
 */
export function unwrap<T>(result: ActionResult<T>): T {
  if (result.ok) return result.data;
  throw new ApiRequestError(result.status, result.status, result.message, result.details);
}
