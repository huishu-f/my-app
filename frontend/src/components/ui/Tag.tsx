/**
 * @file Tag.tsx
 * @description 小标签徽章：四种配色变体 × 两档尺寸，另提供按文本哈希取色的 tagVariantFor；配色无语义含义，状态类标记（草稿/置顶等）应显式指定 variant
 */
import type { TagProps, TagVariant } from '@my-app/shared';

/** 标签变体 → 配色类名，导出供外部自行拼类名复用 */
export const tagClassFor: Record<TagVariant, string> = {
  ink: 'tag-ink',
  ember: 'tag-ember',
  crimson: 'tag-crimson',
  slate: 'tag-slate',
};

/** 尺寸档位 → 字号与水平/垂直内边距类名 */
const sizeClass = {
  sm: 'text-(length:--type-2xs) leading-normal px-2 py-0.5',
  md: 'text-(length:--type-2xs) leading-normal px-2.5 py-0.5',
};

/**
 * Tag 标签徽章
 * @param props {@link TagProps}
 * @example
 * <Tag variant={tagVariantFor(category)} size="sm">{category}</Tag>
 */
export function Tag({ children, variant = 'ink', size = 'md', className = '' }: TagProps) {
  return (
    <span className={`${tagClassFor[variant]} ${sizeClass[size]} ${className}`}>{children}</span>
  );
}

/**
 * 按标签文本哈希出一个稳定的配色变体，保证同名标签在列表/侧边栏配色一致
 * @param label 标签文本
 * @returns 四个 {@link TagVariant} 之一；空字符串散列为 0，恒返回 'ink'
 */
export function tagVariantFor(label: string): TagVariant {
  const variants: TagVariant[] = ['ink', 'ember', 'crimson', 'slate'];
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    // (hash << 5) - hash 等价于 hash * 31 的滚动散列，让相近文本也落到不同变体
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % variants.length;
  return variants[index];
}
