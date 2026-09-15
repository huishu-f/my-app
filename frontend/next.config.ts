/**
 * @file next.config.ts
 * @description Next.js 构建配置：转译共享包、安全响应头、图片域名白名单与打包优化；生产构建期生效，影响产物输出
 */
import type { NextConfig } from 'next';

/**
 * 可选加载 @next/bundle-analyzer 实现打包体积分析
 * ANALYZE 环境变量为 'true' 时启用，未安装时降级为直接返回原配置
 * @param config 原始 Next.js 配置
 * @returns 处理后的 Next.js 配置
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

/** 全局 Next.js 配置：共享包转译、安全响应头、图片域名白名单、打包优化 */
const nextConfig: NextConfig = {
  transpilePackages: ['@my-app/shared'],
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'n.colorhub.me' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
