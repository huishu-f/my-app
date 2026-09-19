/**
 * @file category.ts
 * @description 文章分类常量与工具：分类取值枚举、i18n 文案 key 映射及类型守卫/取标签；分类以中文原值存储，展示时再翻译
 */

/** 文章可选分类取值集合，数组元素即为落库的中文原值 */
export const CATEGORY_VALUES = ['技术', '设计', '生活', '产品', '创业', '其他'] as const;

/** 哨兵值，表示"全部"筛选，不属于 CATEGORY_VALUES，仅用于列表筛选 UI */
export const ALL_CATEGORY = '全部';

/** 由 CATEGORY_VALUES 推导出的分类字面量联合类型 */
export type CategoryValue = (typeof CATEGORY_VALUES)[number];

/** 分类中文原值 → i18n 文案 key 的映射，供 getCategoryLabel 查表翻译 */
export const CATEGORY_LABEL_KEYS: Record<CategoryValue, `categoryNames.${CategoryValue}`> = {
  技术: 'categoryNames.技术',
  设计: 'categoryNames.设计',
  生活: 'categoryNames.生活',
  产品: 'categoryNames.产品',
  创业: 'categoryNames.创业',
  其他: 'categoryNames.其他',
};

/**
 * 类型守卫：判断任意字符串是否为已知分类
 * @param value 待判定的分类字符串
 * @returns 命中 CATEGORY_VALUES 时为 true，并将 value 收窄为 CategoryValue
 */
export function isKnownCategory(value: string): value is CategoryValue {
  return (CATEGORY_VALUES as readonly string[]).includes(value);
}

/**
 * 将分类值翻译为展示文案
 * @param value 分类中文原值（也可能是历史脏数据/自定义标签）
 * @param t i18n 翻译函数
 * @returns 已知分类返回对应翻译文案，未知值原样返回作为兜底
 */
export function getCategoryLabel(value: string, t: (key: string) => string): string {
  return isKnownCategory(value) ? t(CATEGORY_LABEL_KEYS[value]) : value;
}
