"use client";

import { useRouter } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { hasInAppHistory } from "@/lib/navigation";

export function BackLink() {
  const router = useRouter();

  const t = useTranslations("common");

  const handleBack = () => {
    if (hasInAppHistory()) {
      router.back();
    } else {
      router.push("/posts");
    }
  };

  return (
    <button
      onClick={handleBack}
      className="text-muted hover:text-heading mb-8 inline-flex cursor-pointer items-center gap-2 text-(length:--type-xs) font-medium transition-colors duration-[var(--duration-fast)]"
    >
      <ArrowLeft size={14} strokeWidth={2.5} aria-hidden="true" />
      {t("back")}
    </button>
  );
}
