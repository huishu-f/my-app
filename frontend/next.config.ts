/**
 * @file Next.js 构建配置
 * @description Next.js 全局构建配置：共享包转译、生产 console 清理、
 *              图片域名白名单、打包优化、安全响应头（CSP/HSTS 等）与插件接入。
 *              生产构建期生效，影响产物输出与运行时安全策略。
 */
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/**
 * 可选加载 @next/bundle-analyzer 打包分析包装器
 * @param config 原始 Next.js 配置
 * @returns 处理后的 Next.js 配置
 * @description ANALYZE 环境变量为 'true' 时启用；未安装依赖时告警并原样返回配置
 * @warning 需先安装依赖：pnpm add -D @next/bundle-analyzer
 */
const withBundleAnalyzer = (config: NextConfig): NextConfig => {
  if (process.env.ANALYZE !== 'true') return config;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const analyzer = require('@next/bundle-analyzer');
    return analyzer({ enabled: true })(config);
  } catch {
    console.warn(
      '[next.config] @next/bundle-analyzer 未安装，跳过 bundle 分析。安装：pnpm add -D @next/bundle-analyzer',
    );
    return config;
  }
};

/** 全局 Next.js 配置 */
const nextConfig: NextConfig = {
  /** 转译 monorepo 共享包 @my-app/shared */
  transpilePackages: ['@my-app/shared'],
  /** 关闭 X-Powered-By 响应头（减少技术栈暴露） */
  poweredByHeader: false,
  compiler: {
    /** 生产构建移除 console（保留 error），开发环境保留 */
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  images: {
    /** 优先输出的现代图片格式 */
    formats: ['image/avif', 'image/webp'],
    /**
     * 远程图片域名白名单
     * @warning 必须与 lib/validators.ts 的 ALLOWED_IMAGE_HOSTS 保持一致，新增域名两处同步
     */
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'n.colorhub.me' },
    ],
  },
  experimental: {
    /** 按需优化 lucide-react 的具名导入，减小打包体积 */
    optimizePackageImports: ['lucide-react'],
  },
  /**
   * 全局安全响应头：防点击劫持、 MIME 嗅探、CSP、HSTS 等
   * @returns 服务于 /(.*) 的响应头配置数组
   */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          /** 禁止被 iframe 嵌套（防点击劫持） */
          { key: 'X-Frame-Options', value: 'DENY' },
          /** 禁止 MIME 嗅探 */
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          /** 仅同源发送完整 Referer */
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          /** 开启 DNS 预取 */
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          /** HSTS：强制 HTTPS 两年，含子域与 preload */
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          /** 禁用相机/麦克风/地理位置权限 */
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          /**
           * 内容安全策略：默认仅同源；脚本/样式允许内联；
           * 图片允许 data: 与全部 https:；开发环境额外允许 unsafe-eval（HMR/热更新需要）
           */
          { key: 'Content-Security-Policy', value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ') },
        ],
      },
    ];
  },
};

/** next-intl 插件：加载 src/i18n/request.ts 的请求级语言配置（默认路径） */
const withNextIntl = createNextIntlPlugin();

export default withBundleAnalyzer(withNextIntl(nextConfig));
