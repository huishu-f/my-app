export const ALL_CATEGORY = "全部";

export const CATEGORY_VALUES = ["技术", "设计", "生活", "产品", "创业", "其他"] as const;

type CategoryValue = (typeof CATEGORY_VALUES)[number];

export const CATEGORY_LABEL_KEYS: Record<CategoryValue, `categoryNames.${CategoryValue}`> = {
  技术: "categoryNames.技术",
  设计: "categoryNames.设计",
  生活: "categoryNames.生活",
  产品: "categoryNames.产品",
  创业: "categoryNames.创业",
  其他: "categoryNames.其他",
};

export function isKnownCategory(value: string): value is CategoryValue {
  return (CATEGORY_VALUES as readonly string[]).includes(value);
}

export function getCategoryLabel(value: string, t: (key: string) => string): string {
  return isKnownCategory(value) ? t(CATEGORY_LABEL_KEYS[value]) : value;
}
