import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { listPostsServer, getCategoriesServer, getTagsServer } from "@server/blog/blog.cache";
import { SITE_URL, SITEMAP_LIMIT } from "@/config/site";
import { routing } from "@/i18n/routing";
import { postPath } from "@my-app/shared";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();

  const baseUrl = SITE_URL;

  const locales = routing.locales;

  const generatedAt = new Date();

  const [postsData, categoriesData, tagsData] = await Promise.all([
    listPostsServer({ page: 1, limit: SITEMAP_LIMIT }).catch(() => null),
    getCategoriesServer().catch(() => ({ categories: [] })),
    getTagsServer().catch(() => ({ tags: [] })),
  ]);

  const latestPostTime = (postsData?.posts ?? []).reduce<Date | undefined>((acc, post) => {
    const t = new Date(post.updatedAt || post.createdAt);
    return !acc || t > acc ? t : acc;
  }, undefined);
  const staticPages: MetadataRoute.Sitemap = locales.flatMap((locale) => [
    {
      url: `${baseUrl}/${locale}`,
      lastModified: latestPostTime ?? generatedAt,
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/${locale}/posts`,
      lastModified: latestPostTime ?? generatedAt,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
  ]);

  const postPages: MetadataRoute.Sitemap = (postsData?.posts ?? []).flatMap((post) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${postPath(post.id)}`,
      lastModified: new Date(post.updatedAt || post.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  );

  const categoryPages: MetadataRoute.Sitemap = (categoriesData.categories ?? []).flatMap((c) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}/posts?category=${encodeURIComponent(c)}`,

      lastModified: generatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  );

  const tagPages: MetadataRoute.Sitemap = (tagsData.tags ?? []).flatMap((t) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}/posts?tag=${encodeURIComponent(t.name)}`,
      lastModified: generatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  );

  return [...staticPages, ...postPages, ...categoryPages, ...tagPages];
}
