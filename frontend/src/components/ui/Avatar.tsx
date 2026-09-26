import Image from "next/image";
import type { AvatarProps, AvatarSize } from "@my-app/shared";
import { isSafeImageUrl } from "@my-app/shared";

const sizeMap: Record<AvatarSize, { container: string; text: string; px: number }> = {
  xs: { container: "h-5 w-5", text: "text-(length:--type-3xs) leading-none", px: 20 },
  sm: { container: "h-7 w-7", text: "text-(length:--type-2xs) leading-none", px: 28 },
  md: { container: "h-9 w-9", text: "text-(length:--type-xs) leading-none", px: 36 },
  lg: { container: "h-10 w-10", text: "text-(length:--type-sm) leading-none", px: 40 },
  xl: { container: "h-16 w-16", text: "text-(length:--type-lg) leading-none", px: 64 },
};

export function Avatar({ initials, size = "md", src, alt, className = "" }: AvatarProps) {
  if (src && isSafeImageUrl(src)) {
    const { container, px } = sizeMap[size];
    return (
      <Image
        src={src}
        alt={alt || ""}
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
