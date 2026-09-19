/**
 * @file read.ts
 * @description 博客领域客户端**读**接口集合：文章详情；失败统一抛 ApiRequestError
 *
 * 列表 / 草稿 / 收藏 / 站点配置不在此处：它们的页面（首页、`/posts`、`/profile`）都已是 RSC，
 * 直接走 `services/blog/load.ts` 里的 blogService，不经 HTTP；原先对应的客户端读方法
 * （listPosts / listDrafts / listFavorites / updateConfig）因此零调用，已删除。
 *
 * 文章的增、改、删、点赞、收藏也不在此处：它们由 Server Action 承担（见 `@/actions/post`、`@/actions/interaction`），
 * 因为只有 Action 内的重验证才能清掉浏览器 Client Cache，避免「点完赞回到列表还是旧数字」。
 */
import { api } from '@/lib/request';
import type { PostData } from '@my-app/shared';

/** 博客领域读接口集合 */
export const blogApi = {
  /**
   * 获取单篇文章详情，不做缓存以便登录态下取到实时数据（如点赞/收藏状态）
   * @param id 文章 ID
   * @param opts.signal 外部取消信号，组件卸载或切换时可中断请求
   * @returns PostData
   * @throws 文章不存在或网络异常时抛 ApiRequestError
   */
  getPost: (id: string, opts?: { signal?: AbortSignal }) =>
    api.get<PostData>(`/posts/${id}`, undefined, opts),
};
