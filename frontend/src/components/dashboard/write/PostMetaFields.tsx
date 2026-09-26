"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X, ChevronDown } from "lucide-react";
import { FormField } from "@/components/ui/FormField";
import { Tag, tagVariantFor } from "@/components/ui/Tag";
import { CATEGORY_LABEL_KEYS, CATEGORY_VALUES } from "@/lib/category";

const MAX_TAGS = 5;

export function PostMetaFields({
  category,
  onCategoryChange,
  tags,
  onTagsChange,
  summary,
  onSummaryChange,
}: {
  category: string;
  onCategoryChange: (value: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  summary: string;
  onSummaryChange: (value: string) => void;
}) {
  const t = useTranslations("write");
  const tCommon = useTranslations("common");

  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const value = tagInput.trim();
    if (value && !tags.includes(value) && tags.length < MAX_TAGS) {
      onTagsChange([...tags, value]);
      setTagInput("");
    }
  };

  const removeTag = (value: string) => {
    onTagsChange(tags.filter((item) => item !== value));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  const handleTagBlur = () => {
    if (tagInput.trim()) addTag();
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
        <FormField label={t("categoryLabel")}>
          <div className="relative">
            <select
              id="category"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="input-field input-focus appearance-none pr-8"
            >
              {CATEGORY_VALUES.map((c) => (
                <option key={c} value={c}>
                  {tCommon(CATEGORY_LABEL_KEYS[c])}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              strokeWidth={2.5}
              className="text-faint pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
            />
          </div>
        </FormField>

        <FormField label={t("tagLabel")} hint={t("tagHint")}>
          <div className="flex flex-wrap gap-2">
            {tags.map((item) => (
              <Tag
                key={item}
                variant={tagVariantFor(item)}
                size="md"
                className="inline-flex items-center gap-1"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeTag(item)}
                  className="ease-smooth inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-current/70 transition-colors duration-[var(--duration-fast)] hover:text-current"
                  aria-label={`${t("removeTag")}：${item}`}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </Tag>
            ))}
            {tags.length < MAX_TAGS && (
              <input
                id="tag-input"
                name="tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={handleTagBlur}
                placeholder={t("tagPlaceholder")}
                className="border-stroke-strong bg-card-bg text-body placeholder:text-muted input-focus h-9 w-32 rounded-md border px-3 text-(length:--type-2xs) leading-normal"
              />
            )}
          </div>
        </FormField>
      </div>

      <div>
        <FormField label={t("summaryLabel")} hint={t("summaryHint")}>
          <textarea
            id="summary"
            name="summary"
            placeholder={t("summaryPlaceholder")}
            value={summary}
            onChange={(e) => onSummaryChange(e.target.value)}
            maxLength={500}
            rows={2}
            className="textarea-field input-focus text-(length:--type-xs)"
          />
        </FormField>
      </div>
    </>
  );
}
