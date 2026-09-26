import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

export function WriteCta() {
  const t = useTranslations("home");

  return (
    <Button href="/write" variant="outline" size="lg">
      {t("startWriting")}
    </Button>
  );
}
