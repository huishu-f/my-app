/**
 * @file buildPostsUrl.ts
 * @description 文章列表 URL 构建工具：在当前搜索参数基础上应用变更项，
 *              生成 /posts?... 路径，供列表页筛选与分页跳转使用。
 */

/**
 * 构建文章列表 URL
 * 规则：变更值为 null/undefined/空字符串时删除该参数；变更不含 page 时自动清空 page（回第一页）
 * @param searchParams 当前 URL 搜索参数（URLSearchParams 或 Record）
 * @param changes 需要变更的键值对
 * @returns 构建完成的文章列表路径（无参数时为 /posts）
 */
export function buildPostsUrl(
  searchParams: URLSearchParams | Record<string, string | undefined>,
  changes: Record<string, string | null | undefined>,
): string {
  /** 统一转换为 URLSearchParams（Record 形式先剔除空值） */
  const params =
    searchParams instanceof URLSearchParams
      ? new URLSearchParams(searchParams)
      : new URLSearchParams(
          Object.entries(searchParams).reduce<Record<string, string>>((acc, [k, v]) => {
            if (v) acc[k] = v;
            return acc;
          }, {}),
        );
  /** 应用变更项：空值删除、非空设置 */
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || value === '') params.delete(key);
    else params.set(key, value);
  }
  /** 筛选变化时重置页码（仅显式传 page 的调用保留页码） */
  if (!Object.keys(changes).some((k) => k === 'page')) params.delete('page');
  /** 序列化查询串 */
  const qs = params.toString();
  return qs ? `/posts?${qs}` : '/posts';
}
