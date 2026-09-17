/**
 * @file CoverFallback.tsx
 * @description 封面兜底占位：固定 16:10 比例的图片图标灰块，用于缺封面时补住布局；纯装饰不可点击，比例与图标不提供配置入口
 */
import { ImageIcon } from 'lucide-react';
import type { CoverFallbackProps } from '@my-app/shared';

/**
 * CoverFallback 封面占位块
 * @param props {@link CoverFallbackProps}
 * @example
 * // 文章未设置封面或封面图加载失败时，替换原本的 <Image>
 * {cover ? <Image src={cover} alt={title} fill /> : <CoverFallback />}
 */
export function CoverFallback({ className = '' }: CoverFallbackProps) {
  return (
    <div
      className={`cover-fallback text-muted flex aspect-16/10 w-full items-center justify-center rounded-md ${className}`}
    >
      {/* 28px 大尺寸装饰图标：strokeWidth 取 1.5（全站默认 2.5）——图标放大后同笔画会显重，减细才与点阵底纹的轻重相称 */}
      <ImageIcon size={28} strokeWidth={1.5} aria-hidden="true" />
    </div>
  );
}
