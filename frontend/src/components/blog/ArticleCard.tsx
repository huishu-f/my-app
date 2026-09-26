import { memo } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Eye, Heart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CoverFallback } from "@/components/ui/CoverFallback";
import { Avatar } from "@/components/ui/Avatar";
import { Tag, tagVariantFor } from "@/components/ui/Tag";
import { formatCount, formatDate } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { CATEGORY_LABEL_KEYS, isKnownCategory } from "@/lib/category";
import { stripHtml, stripMarkdown } from "@/lib/markdown";
import { isSafeImageUrl } from "@my-app/shared";
import type { ArticleCardProps } from "@my-app/shared";

export const ArticleCard = memo(function ArticleCard({
  post,
  href,
  readMoreLabel,
  badge,
  tags,
  actions,
  extraStats,
  coverWidth = "aspect-16/10 w-full sm:aspect-auto sm:w-50",
  className = "",
  variant = "horizontal",
}: ArticleCardProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");

  const coverImage = post.coverImage;

  const categoryLabel = isKnownCategory(post.category)
    ? t(CATEGORY_LABEL_KEYS[post.category])
    : post.category;

  const isVertical = variant === "vertical";

  const cover = (
    <div
      className={`relative shrink-0 overflow-hidden rounded-md ${
        isVertical ? "aspect-16/10 w-full" : coverWidth
      }`}
    >
      {coverImage && isSafeImageUrl(coverImage) ? (
        <Image
          src={coverImage}
          alt={post.title}
          fill
          sizes={isVertical ? "(max-width: 768px) 100vw, 400px" : "(max-width: 640px) 100vw, 200px"}
          referrerPolicy="no-referrer"
          unoptimized
          className="ease-smooth aspect-16/10 w-full rounded-md object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-103"
        />
      ) : (
        <CoverFallback className={isVertical ? "aspect-16/10 w-full" : "sm:h-full"} />
      )}
    </div>
  );

  const card = isVertical ? (
    <div className="flex h-full flex-col gap-4">
      {cover}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="row-sm">
          <span className="text-heading text-(length:--type-2xs) leading-normal font-semibold tracking-[0.04em]">
            {categoryLabel}
          </span>
          {badge}
        </div>

        <h2 className="section-title line-clamp-2 tracking-[-0.01em]">
          {stripMarkdown(post.title)}
        </h2>

        <p className="text-body line-clamp-2 text-(length:--type-sm) leading-normal">
          {stripHtml(post.summary)}
        </p>

        <div className="meta-text mt-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1 truncate">
            <Avatar initials={(post.authorName?.charAt(0) || "U").toUpperCase()} size="xs" />
            {post.authorName}
          </span>
          <span className="meta-dot" aria-hidden="true" />
          <span>{formatDate(post.publishedAt || post.createdAt, locale)}</span>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex flex-col gap-4 sm:flex-row">
      {cover}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="row-sm">
          <span className="text-heading text-(length:--type-2xs) leading-normal font-semibold tracking-[0.04em]">
            {categoryLabel}
          </span>
          {badge}
        </div>

        <h2 className="section-title line-clamp-2 tracking-[-0.01em]">
          {stripMarkdown(post.title)}
        </h2>

        <p className="text-body line-clamp-2 text-(length:--type-sm) leading-normal sm:line-clamp-3">
          {stripHtml(post.summary)}
        </p>

        {tags && tags.length > 0 && (
          <div className="relative z-(--z-raised) flex flex-wrap gap-2">
            {tags.map((t) => (
              <Tag key={t} variant={tagVariantFor(t)} size="sm">
                {t}
              </Tag>
            ))}
          </div>
        )}

        <div className="row-sm meta-text mt-auto flex-wrap">
          <span className="inline-flex items-center gap-2 truncate">
            <Avatar initials={(post.authorName?.charAt(0) || "U").toUpperCase()} size="xs" />
            {post.authorName}
          </span>
          <span className="meta-dot" aria-hidden="true" />
          <span>{formatDate(post.publishedAt || post.createdAt, locale)}</span>
          <span className="meta-dot" aria-hidden="true" />
          <span className="row-xs">
            <Eye size={12} strokeWidth={2.5} />
            {formatCount(post.views)}
          </span>
          <span className="meta-dot" aria-hidden="true" />
          <span className="row-xs">
            <Heart size={12} strokeWidth={2.5} />
            {formatCount(post.likes)}
          </span>
          {extraStats?.map((s, i) => (
            <span key={`stat-${i}`} className="row-xs">
              <span className="meta-dot" aria-hidden="true" />
              {s.icon}
              {formatCount(s.value)}
            </span>
          ))}
        </div>

        {actions && <div className="row-sm relative z-(--z-raised) mt-2">{actions}</div>}

        {href && (
          <span className="text-muted group-hover:text-accent mt-2 inline-flex items-center gap-1 text-(length:--type-2xs) font-semibold transition-colors duration-[var(--duration-fast)]">
            {readMoreLabel ?? t("readMore")}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ease-smooth transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );

  const baseClass = `group relative card card-hover ${isVertical ? "p-5" : "p-6"} ${className}`;

  return (
    <div className={baseClass}>
      {href && (
        <Link
          href={href}
          className="absolute inset-0 z-(--z-content) rounded-xl"
          aria-label={post.title}
        />
      )}
      {card}
    </div>
  );
});
