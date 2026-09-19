/**
 * @file load.ts
 * @description 博客领域的服务端数据获取（RSC/Route Handler 用）：直连 blogService 取文章、分类、标签，公开读垫 unstable_cache 持久缓存
 *
 * 两层缓存体系（勿混淆）：
 * - 本文件的 unstable_cache = Next.js Data Cache（同进程内存/磁盘，dev 重启即清空，生产由平台持有），
 *   挡的是渲染期重复执行 service + 序列化开销；tags 与后端写接口的 revalidateTag 调用一一对应。
 * - 后端仓库层的 Upstash Redis = 业务缓存，挡 KV 存储读，与 Next 缓存互不替代。
 * 鉴权分支（listPostsServer 的 withAuth=true）读 cookies() 属请求个性化数据，一律不缓存。
 */
import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getContainer } from '@my-app/backend/container';
import { getAuthPayload } from '@/services/auth/load';
import {
  CategoriesData,
  NeighborPostsData,
  Post,
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
 * 公开文章详情的持久缓存（参数自动并入 cache key，因此每篇各有条目）。
 *
 * 这里刻意**不**为每篇文章各建一个 unstable_cache 实例去挂 `post:{id}` 标签 —— 那个粒度是无效的：
 * 单篇文章的增删改必然改变列表与分类/标签聚合，所以文章写操作**无条件**失效 `posts`（见 `@/server/cache`）；
 * 而本缓存的产物是详情 payload，里面含有冗余写进去的 authorName（文章记录上）与 userName/userAvatar（评论上），
 * 用户改资料也会改到它，所以它同样必须跟着 `posts` 一起失效。
 * 两条一叠加，更细的 `post:{id}` 标签永远不会被单独命中 —— 于是「按 id 建实例 + 一张 Map + 淘汰上限」
 * 只换来内存开销，没有任何失效精度。去掉后行为完全等价。
 *
 * ponytail: 失效粒度是列表级（改一篇会让其它文章的详情 Data Cache 也回源）。升级路径是 Next 的
 *   `cacheComponents` + `'use cache'` + `cacheTag()`（可在运行期声明动态 tag），届时可恢复逐篇精度。
 *   当前 Next 16.3.5 下调用 cacheTag 会直接报 "cacheTag() is only available with the cacheComponents config"，
 *   开启它会整体改变全站缓存模型（页面不再默认静态、revalidate 语义改变），不是这一项能顺带完成的改动。
 */
const getPublicPostCached = unstable_cache(
  async (postId: string): Promise<PostData> => {
    const { blogService } = getContainer();
    const post = await blogService.getPost(postId);
    return { post };
  },
  ['blog', 'public-post'],
  { tags: ['posts'], revalidate: POSTS_REVALIDATE },
);

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

/**
 * 个人中心三个列表：`null` 表示该项**加载失败**，与空数组的「确实没有内容」区分开，
 * 供 UI 分别渲染错误态与空态（早期版本三个请求各自 catch 成空数组，两者无法区分）
 */
export interface ProfileListsData {
  /** 我发布的文章；null 表示加载失败 */
  published: Post[] | null;
  /** 我的草稿；null 表示加载失败 */
  drafts: Post[] | null;
  /** 我的收藏；null 表示加载失败 */
  favorites: Post[] | null;
}

/**
 * 单份列表的取数上限（条）：个人内容远少于此，一次取全避免个人中心出现分页；
 * 走 internal 以突破公开 API 的 100 条钳制
 */
const PROFILE_LIST_LIMIT = 1000;

/**
 * 服务端取个人中心三个列表（我的文章 / 我的草稿 / 我的收藏）
 *
 * 与公开列表不同，这三项都依赖登录态，**不进 Data Cache**。
 * 三项并行发起、各自兜底：单项失败只影响该项（标记 null），不会拖垮整个个人中心。
 * @returns ProfileListsData，每项独立可取 null
 */
export async function getProfileListsServer(): Promise<ProfileListsData> {
  const payload = await getAuthPayload();
  // 未登录时三项都无内容可展示，返回空数组而非 null（null 语义专指「加载失败」）
  if (!payload) return { published: [], drafts: [], favorites: [] };

  const { blogService } = getContainer();
  const [published, drafts, favorites] = await Promise.all([
    blogService
      .listPosts({ authorId: payload.id, internal: true, limit: PROFILE_LIST_LIMIT })
      .then((data) => data.posts)
      .catch(() => null),
    blogService
      .listPosts({
        draft: true,
        user: payload,
        internal: true,
        limit: PROFILE_LIST_LIMIT,
      })
      .then((data) => data.posts)
      .catch(() => null),
    blogService.listFavoritePosts(payload.id).catch(() => null),
  ]);

  return { published, drafts, favorites };
}
