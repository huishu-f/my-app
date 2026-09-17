/**
 * @file server.ts
 * @description 博客领域的服务端数据获取（RSC/Route Handler 用）：直连 blogService 取文章、分类、标签，公开读垫 unstable_cache 持久缓存
 *
 * 两层缓存体系（勿混淆）：
 * - 本文件的 unstable_cache = Next.js Data Cache（同进程内存/磁盘，dev 重启即清空，生产由平台持有），
 *   挡的是渲染期重复执行 service + 序列化开销；tags 与后端写接口的 revalidateTag 调用一一对应。
 * - 后端仓库层的 Upstash Redis = 业务缓存，挡 KV 存储读，与 Next 缓存互不替代。
 * 鉴权分支（withAuth=true / getPostServer）读 cookies() 属请求个性化数据，一律不缓存。
 */
import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getContainer } from '@server/container';
import { getAuthPayload } from '@/services/auth/server';
import type {
  CategoriesData,
  NeighborPostsData,
  PostData,
  PostListParams,
  PostsListData,
  TagsData,
} from '@my-app/shared';

/** 公开列表缓存有效期（s）：tag 失效为主、周期兜底 */
const POSTS_REVALIDATE = 300;

/** 分类/标签缓存有效期（s）：变化频率低 */
const TAXONOMY_REVALIDATE = 3600;

/**
 * 挑出列表查询允许透传给 blogService 的字段，避免额外属性污染下游
 * @param params 原始列表参数
 * @returns 仅含 category/tag/q/page/limit 的白名单对象
 */
function normalizeListParams(params: PostListParams) {
  return {
    category: params.category,
    tag: params.tag,
    q: params.q,
    page: params.page,
    limit: params.limit,
  };
}

/** 带登录态直连 blogService 查列表（个性化数据不进缓存） */
async function listPostsInternal(params: PostListParams): Promise<PostsListData> {
  const { blogService } = getContainer();
  const user = await getAuthPayload();
  return blogService.listPosts({
    ...normalizeListParams(params),
    user: user ?? undefined,
    // 服务端直连（非 HTTP API）视为内部调用：分页上限放宽到 1000，供 sitemap 整站收录
    internal: true,
  });
}

/** 公开列表的持久缓存版本：参数自动并入 cache key，按 posts 标签失效 */
const listPostsCached = unstable_cache(
  async (params: PostListParams): Promise<PostsListData> => {
    const { blogService } = getContainer();
    return blogService.listPosts({
      ...normalizeListParams(params),
      // 服务端直连（非 HTTP API）视为内部调用：分页上限放宽到 1000，供 sitemap 整站收录
      internal: true,
    });
  },
  ['blog', 'list-posts'],
  { tags: ['posts'], revalidate: POSTS_REVALIDATE },
);

/**
 * 服务端获取文章列表
 * @param params 列表筛选与分页参数，默认 {}
 * @param withAuth 是否携带当前登录态，true 时结果含个性化字段（如点赞/收藏状态）且不缓存
 * @returns PostsListData
 */
export async function listPostsServer(
  params: PostListParams = {},
  withAuth = false,
): Promise<PostsListData> {
  return withAuth ? listPostsInternal(params) : listPostsCached(params);
}

/**
 * 服务端获取单篇文章详情，携带当前登录态以返回个性化数据（不缓存）
 * @param id 文章 ID
 * @returns PostData
 */
export async function getPostServer(id: string): Promise<PostData> {
  const { blogService } = getContainer();
  const user = await getAuthPayload();
  const post = await blogService.getPost(id, user ?? undefined);
  return { post };
}

/**
 * 公开文章详情的持久缓存工厂（非导出）：每个文章 id 建一个 unstable_cache 实例，
 * 实例自身挂 post:{id} 精确 tag——unstable_cache 的 tags 是定义期常量，动态 tag
 * 须按 id 各建实例。invalidateBlogCache(postId) 命中该 tag 时只击穿这一篇，不再全站重拉。
 */
const postCacheFactories = new Map<string, (id: string) => Promise<PostData>>();

/** 工厂缓存容量上限：防长生命周期进程内 Map 无限增长；超限淘汰最旧（Map 迭代序即插入序） */
const POST_CACHE_FACTORIES_CAP = 1000;

function getPublicPostCached(id: string): Promise<PostData> {
  let cached = postCacheFactories.get(id);
  if (!cached) {
    if (postCacheFactories.size >= POST_CACHE_FACTORIES_CAP) {
      const oldestKey = postCacheFactories.keys().next().value;
      if (oldestKey !== undefined) postCacheFactories.delete(oldestKey);
    }
    cached = unstable_cache(
      async (postId: string): Promise<PostData> => {
        const { blogService } = getContainer();
        const post = await blogService.getPost(postId);
        return { post };
      },
      ['blog', 'public-post', id],
      { tags: ['posts', `post:${id}`], revalidate: POSTS_REVALIDATE },
    );
    postCacheFactories.set(id, cached);
  }
  return cached(id);
}

/**
 * 服务端获取公开文章详情，不依赖登录态；经 React cache 做单次请求内去重，供 ISR/静态渲染复用
 * @param id 文章 ID
 * @returns PostData
 */
export const getPublicPostServer = cache((id: string) => getPublicPostCached(id));

/**
 * 服务端获取指定文章的前后相邻文章（公开，持久缓存）
 * @param id 文章 ID
 * @returns NeighborPostsData
 */
export const getNeighborPostsServer = ((): ((id: string) => Promise<NeighborPostsData>) => {
  const cached = unstable_cache(
    async (id: string): Promise<NeighborPostsData> => {
      const { blogService } = getContainer();
      return blogService.getNeighborPosts(id);
    },
    ['blog', 'neighbor-posts'],
    { tags: ['posts'], revalidate: POSTS_REVALIDATE },
  );
  return cached;
})();

/**
 * 服务端获取全部分类（公开，持久缓存）
 * @returns CategoriesData
 */
export const getCategoriesServer = ((): (() => Promise<CategoriesData>) => {
  const cached = unstable_cache(
    async (): Promise<CategoriesData> => {
      const { blogService } = getContainer();
      return { categories: await blogService.getCategories() };
    },
    ['blog', 'categories'],
    { tags: ['categories'], revalidate: TAXONOMY_REVALIDATE },
  );
  return cached;
})();

/**
 * 服务端获取全部标签（公开，持久缓存）
 * @returns TagsData
 */
export const getTagsServer = ((): (() => Promise<TagsData>) => {
  const cached = unstable_cache(
    async (): Promise<TagsData> => {
      const { blogService } = getContainer();
      return { tags: await blogService.getTags() };
    },
    ['blog', 'tags'],
    { tags: ['tags'], revalidate: TAXONOMY_REVALIDATE },
  );
  return cached;
})();
