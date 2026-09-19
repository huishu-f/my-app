/**
 * @file buildPostsUrl.ts
 * @description 拼接 /posts 列表页查询 URL：在当前 searchParams 基础上叠加/清除筛选变更，用于分类、标签、分页等链接生成
 */

/**
 * 基于现有查询参数生成 /posts 链接
 * @param searchParams 当前 URL 查询参数，兼容 URLSearchParams 与对象两种形态；对象形态会过滤掉空值
 * @param changes 需要写入的变更；值为 null/undefined/'' 表示删除该键，否则覆盖为新值
 * @returns 形如 `/posts?category=x&page=2` 的路径；无任何参数时返回 `/posts`
 */
export function buildPostsUrl(
  searchParams: URLSearchParams | Record<string, string | undefined>,
  changes: Record<string, string | null | undefined>,
): string {
  const params =
    searchParams instanceof URLSearchParams
      ? new URLSearchParams(searchParams)
      : new URLSearchParams(
          Object.entries(searchParams).reduce<Record<string, string>>((acc, [k, v]) => {
            if (v) acc[k] = v;
            return acc;
          }, {}),
        );

  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || value === '') params.delete(key);
    else params.set(key, value);
  }

  // 若本次变更未显式指定 page，则清除 page，避免切换分类/标签后停留在越界的旧页码
  if (!Object.keys(changes).some((k) => k === 'page')) params.delete('page');

  const qs = params.toString();
  return qs ? `/posts?${qs}` : '/posts';
}
