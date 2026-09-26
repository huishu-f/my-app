import type { TagProps, TagVariant } from "@my-app/shared";

export const tagClassFor: Record<TagVariant, string> = {
  ink: "tag-ink",
  ember: "tag-ember",
  crimson: "tag-crimson",
  slate: "tag-slate",
};

const sizeClass = {
  sm: "text-(length:--type-2xs) leading-normal px-2 py-0.5",
  md: "text-(length:--type-2xs) leading-normal px-2.5 py-0.5",
};

export function Tag({ children, variant = "ink", size = "md", className = "" }: TagProps) {
  return (
    <span className={`${tagClassFor[variant]} ${sizeClass[size]} ${className}`}>{children}</span>
  );
}

export function tagVariantFor(label: string): TagVariant {
  const variants: TagVariant[] = ["ink", "ember", "crimson", "slate"];
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % variants.length;
  return variants[index];
}
