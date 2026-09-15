/**
 * @file category.ts
 * @description 文章分类数据值与展示层翻译的共享映射。
 *              分类数据值保持中文原值（数据层跨语言一致，与「全部」哨兵同一约定），
 *              展示文案经 common.categoryNames 命名空间翻译。
 */

/** 固定分类数据值（中文哨兵值，写入与查询均使用原值） */
export const CATEGORY_VALUES = ['技术', '设计', '生活', '产品', '创业', '其他'] as const;

/** 分类数据值类型 */
export type CategoryValue = (typeof CATEGORY_VALUES)[number];

/** 分类数据值 → common.categoryNames 翻译键（字面量映射，保留编译期 key 校验） */
export const CATEGORY_LABEL_KEYS: Record<CategoryValue, `categoryNames.${CategoryValue}`> = {
  技术: 'categoryNames.技术',
  设计: 'categoryNames.设计',
  生活: 'categoryNames.生活',
  产品: 'categoryNames.产品',
  创业: 'categoryNames.创业',
  其他: 'categoryNames.其他',
};

/**
 * 判断是否为已知分类数据值（用于展示层兜底：未知值原样显示，不阻断渲染）
 * @param value 待判定的分类值
 */
export function isKnownCategory(value: string): value is CategoryValue {
  return (CATEGORY_VALUES as readonly string[]).includes(value);
}
