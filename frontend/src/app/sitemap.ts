/**
 * @file sitemap.ts
 * @description 生成 /sitemap.xml 的元数据路由：把各语言的静态入口、文章详情、分类与标签筛选页展开为绝对地址条目；依赖服务端博客接口取数，任一取数失败只影响对应分组，不阻断整体输出
 */
import type { MetadataRoute } from 'next';
import { connection } from 'next/server';
import { listPostsServer, getCategoriesServer, getTagsServer } from '@/services/blog/server';
import { SITE_URL } from '@/config/site';
import { routing } from '@/i18n/routing';

/** 站点地图缓存复用周期，单位 s（3600 = 1 小时）；到期后重新拉取文章/分类/标签再出图 */
export const revalidate = 3600;

/**
 * 构建站点地图条目集合
 * @returns 静态页、文章详情、分类筛选、标签筛选四组条目按 locale 展开后的合并数组；
 * 博客接口不可用时对应分组退化为空数组，只输出剩余条目，不抛异常
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /**
   * 显式等待请求连接：使该元数据路由退出构建期静态预渲染，改为运行时生成并按 revalidate 周期再生
   * 否则条目会在 build 时被固化，新发文章不会出现在 sitemap 里
   */
  await connection();

  /** 站点根地址，用于拼绝对 URL（sitemap 要求完整域名） */
  const baseUrl = SITE_URL;
  /** 全站支持的语言列表，每个条目都要按语言各出一条 */
  const locales = routing.locales;

  /** 本组条目的生成时刻；lastModified 对爬虫是内容变更信号，取「本次生成时间」每次都在变等于没有信号 */
  const generatedAt = new Date();

  /**
   * 并发拉取文章 / 分类 / 标签三份数据，各自 catch 降级以免整张站点地图失败：
   * 文章接口失败置为 null（后续用 ?? [] 兜底），分类与标签接口失败退化为空数组
   * limit: 1000 为收录上限，只取第一页前 1000 篇，超出部分不会进入 sitemap
   */
  const [postsData, categoriesData, tagsData] = await Promise.all([
    listPostsServer({ page: 1, limit: 1000 }).catch(() => null),
    getCategoriesServer().catch(() => ({ categories: [] })),
    getTagsServer().catch(() => ({ tags: [] })),
  ]);

  /**
   * 静态入口：每种语言固定 2 条——语言首页（priority 1，站内最高权重）与文章列表页（priority 0.9）
   * lastModified 取最新一篇文章的更新时间：首页/列表内容随发文而变，比「每次生成时刻」更贴近真实变更
   */
  const latestPostTime = (postsData?.posts ?? []).reduce<Date | undefined>((acc, post) => {
    const t = new Date(post.updatedAt || post.createdAt);
    return !acc || t > acc ? t : acc;
  }, undefined);
  const staticPages: MetadataRoute.Sitemap = locales.flatMap((locale) => [
    {
      url: `${baseUrl}/${locale}`,
      lastModified: latestPostTime ?? generatedAt,
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/${locale}/posts`,
      lastModified: latestPostTime ?? generatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
  ]);

  /**
   * 文章详情页：每篇文章对每种语言各出一条
   * lastModified 取文章更新时间 updatedAt，缺失时回退到 createdAt
   * changeFrequency 'weekly' + priority 0.8：内容会随编辑变化的次级权重
   */
  const postPages: MetadataRoute.Sitemap = (postsData?.posts ?? []).flatMap((post) =>
    locales.map((locale) => ({
      // id 形如时间戳-slug-随机串，含中文 slug 时须编码（与 generateStaticParams 的 encode 行为一致）
      url: `${baseUrl}/${locale}/posts/${encodeURIComponent(post.id)}`,
      lastModified: new Date(post.updatedAt || post.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  );

  /**
   * 分类筛选页：复用文章列表路由，以 `?category=` 查询参数表达；分类名可能含中文等字符，拼接时须 encodeURIComponent
   * priority 0.6：同一列表页的聚合视图，权重低于文章详情
   */
  const categoryPages: MetadataRoute.Sitemap = (categoriesData.categories ?? []).flatMap((c) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}/posts?category=${encodeURIComponent(c)}`,
      // 分类/标签筛选页无独立的时间戳字段，lastModified 随最外层生成时刻固定为一次值
      lastModified: generatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  );

  /**
   * 标签筛选页：标签是对象，取 name 做查询参数值；同样需要 encodeURIComponent
   * priority 0.5：四种分组里最低权重
   */
  const tagPages: MetadataRoute.Sitemap = (tagsData.tags ?? []).flatMap((t) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}/posts?tag=${encodeURIComponent(t.name)}`,
      lastModified: generatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  );

  /** 合并输出：条目总数 = (静态 2 + 文章数 + 分类数 + 标签数) × routing.locales 数量 */
  return [...staticPages, ...postPages, ...categoryPages, ...tagPages];
}
