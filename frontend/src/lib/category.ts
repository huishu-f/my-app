/**
 * @file 文章分类映射
 * @description 维护分类数据值与展示文案的映射关系。
 *              分类数据值固定使用中文原值，保证多语言环境下数据层（URL 参数、数据库）一致；
 *              展示层通过 i18n common.categoryNames 命名空间翻译为当前语言文案。
 */

/** 全部固定分类数据值（中文哨兵值，写入与查询均使用原值，不走翻译） */
export const CATEGORY_VALUES = ['技术', '设计', '生活', '产品', '创业', '其他'] as const;

/** 「全部」分类哨兵值 — 跨语言固定常量，用于 URL 数据层表示不筛选分类 */
export const ALL_CATEGORY = '全部';

/** 分类数据值类型（由 CATEGORY_VALUES 推导的字符串字面量联合） */
export type CategoryValue = (typeof CATEGORY_VALUES)[number];

/** 分类数据值 → i18n 翻译键映射（字面量模板类型，保留编译期 key 校验） */
export const CATEGORY_LABEL_KEYS: Record<CategoryValue, `categoryNames.${CategoryValue}`> = {
  技术: 'categoryNames.技术',
  设计: 'categoryNames.设计',
  生活: 'categoryNames.生活',
  产品: 'categoryNames.产品',
  创业: 'categoryNames.创业',
  其他: 'categoryNames.其他',
};

/**
 * 判断给定值是否为已知分类数据值
 * @param value 待判定的分类值
 * @returns 是已知分类时返回 true，并收窄类型为 CategoryValue
 * @description 用于展示层兜底：未知值原样显示，不阻断渲染
 */
export function isKnownCategory(value: string): value is CategoryValue {
  return (CATEGORY_VALUES as readonly string[]).includes(value);
}

/**
 * 获取分类的展示文案
 * @param value 分类数据值
 * @param t next-intl 的翻译函数（common 命名空间）
 * @returns 已知分类返回翻译后的文案；未知值原样返回
 */
export function getCategoryLabel(
  value: string,
  t: (key: string) => string,
): string {
  return isKnownCategory(value) ? t(CATEGORY_LABEL_KEYS[value]) : value;
}
