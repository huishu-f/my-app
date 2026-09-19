/**
 * @file Avatar.tsx
 * @description 用户头像：src 命中可信 https 图片域名白名单时渲染真实头像，否则降级为首字母渐变圆形占位；不可信地址（含相对路径）一律不加载图片
 */
import Image from 'next/image';
import type { AvatarProps, AvatarSize } from '@my-app/shared';
import { isSafeImageUrl } from '@my-app/shared/lib/validators';

/** 尺寸档位 → 容器/文字类名与图片边长（px 字段单位：像素，供 next/image 定宽高）；
    字号统一取 --type-* 刻度（不再写 text-[Npx] 裸值），随容器放大逐档递增，迷你档用刻度下限 --type-3xs */
const sizeMap: Record<AvatarSize, { container: string; text: string; px: number }> = {
  xs: { container: 'h-5 w-5', text: 'text-(length:--type-3xs) leading-none', px: 20 },
  sm: { container: 'h-7 w-7', text: 'text-(length:--type-2xs) leading-none', px: 28 },
  md: { container: 'h-9 w-9', text: 'text-(length:--type-xs) leading-none', px: 36 },
  lg: { container: 'h-10 w-10', text: 'text-(length:--type-sm) leading-none', px: 40 },
  xl: { container: 'h-16 w-16', text: 'text-(length:--type-lg) leading-none', px: 64 },
};

/**
 * Avatar 头像
 * @param props {@link AvatarProps}
 * @example
 * <Avatar
 *   initials={(authorName.charAt(0) || 'U').toUpperCase()}
 *   src={avatarUrl}
 *   alt={authorName}
 *   size="sm"
 * />
 */
export function Avatar({ initials, size = 'md', src, alt, className = '' }: AvatarProps) {
  // 仅白名单 https 地址走图片渲染，其余（含相对路径、非法 URL）落到下方字母兜底
  if (src && isSafeImageUrl(src)) {
    const { container, px } = sizeMap[size];
    return (
      <Image
        src={src}
        alt={alt || ''}
        width={px}
        height={px}
        referrerPolicy="no-referrer"
        className={`${container} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      className={`${sizeMap[size].container} ${sizeMap[size].text} avatar-gradient flex shrink-0 items-center justify-center rounded-full font-semibold ${className}`}
    >
      {initials}
    </span>
  );
}
