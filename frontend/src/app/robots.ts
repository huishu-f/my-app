/**
 * @file robots.ts
 * @description 生成 robots.txt 爬虫规则，允许全站收录，屏蔽登录、注册、写作、设置、个人资料等私有页面与 /api 路径；
 *              由 Next.js 在请求 /robots.txt 时执行
 */
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/site';

/**
 * 生成 robots.txt 爬虫规则
 * @description 对所有 User-Agent 放行根路径，禁止抓取各语言前缀下的私有页面（login/register/write/settings/profile）与 /api，
 *              并声明 sitemap 地址（站点地址 + /sitemap.xml）
 * @returns MetadataRoute.Robots 规则对象，含 rules（userAgent/allow/disallow）与 sitemap 地址
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
