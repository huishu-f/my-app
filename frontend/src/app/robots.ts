/**
 * @file robots.ts
 * @description 生成 robots.txt，允许全站收录并屏蔽登录、写作、设置等私有页面与 API 路径；由 Next.js 在请求 /robots.txt 时执行
 */
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/site';

/**
 * 生成 robots.txt 爬虫规则
 * @returns 爬虫规则对象与 sitemap 地址
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL;
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/*/login', '/*/register', '/*/write', '/*/settings', '/*/profile', '/api'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
