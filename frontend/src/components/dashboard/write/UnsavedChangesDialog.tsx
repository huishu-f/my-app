"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}) {
  const t = useTranslations("write");

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} title={t("leaveConfirmTitle")}>
      <p className="text-body text-(length:--type-sm) leading-normal">{t("leaveConfirmDesc")}</p>
      <div className="mt-8 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          {t("keepEditing")}
        </Button>
        <Button variant="danger" onClick={onDiscard}>
          {t("discardChanges")}
        </Button>
      </div>
    </Modal>
  );
}
