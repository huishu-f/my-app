/**
 * @file robots.ts
 * @description 生成 /robots.txt 的元数据路由：放行全站公开内容，屏蔽带 locale 前缀的登录/注册/写作/设置/个人中心等私有路径与 /api 接口，并声明 sitemap 地址
 */
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/config/site';

/**
 * robots 规则入口，Next 在访问 /robots.txt 时执行本函数并序列化为文本
 * @returns robots 配置：rules 为单组爬虫许可规则，sitemap 为站点地图绝对地址
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL;
  return {
    rules: {
      /** 通配所有爬虫，不按 UA 区分规则 */
      userAgent: '*',
      /** 默认允许抓取全站公开内容 */
      allow: '/',
      /**
       * 禁止抓取的路径：站点强制带语言前缀，规则首段用通配符 `*` 占位，
       * 使同一条规则同时覆盖 /zh 与 /en；/api 挂在根路径下无 locale 前缀，直接按前缀屏蔽
       */
      disallow: ['/*/login', '/*/register', '/*/write', '/*/settings', '/*/profile', '/api'],
    },
    /** 拼接 SITE_URL 得到绝对地址，供爬虫顺带发现 sitemap.ts 产出的站点地图 */
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
