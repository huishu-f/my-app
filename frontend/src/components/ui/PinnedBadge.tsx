import { Pin } from "lucide-react";
import { useTranslations } from "next-intl";

export function PinnedBadge() {
  const t = useTranslations("common");
  return (
    <span className="chip-sm">
      <Pin size={10} strokeWidth={2.5} />
      {t("pinned")}
    </span>
  );
}
