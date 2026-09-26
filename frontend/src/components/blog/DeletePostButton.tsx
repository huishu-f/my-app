"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Trash2, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useDeletePost } from "@/hooks/usePosts";
import { postEditPath } from "@my-app/shared";
import type { PostIdProps } from "@my-app/shared";

interface DeletePostButtonProps extends PostIdProps {
  description?: string;

  redirectTo?: string;

  variant?: "full" | "compact";

  onRemoved?: () => void;
}

export function DeletePostButton({
  postId,
  description,
  redirectTo,
  variant = "full",
  onRemoved,
}: DeletePostButtonProps) {
  const router = useRouter();

  const t = useTranslations("post");

  const tCommon = useTranslations("common");

  const [showDelete, setShowDelete] = useState(false);

  const deleteMutation = useDeletePost();

  const confirmDelete = () => {
    deleteMutation.mutate(postId, {
      onSuccess: () => {
        onRemoved?.();
        if (redirectTo) router.replace(redirectTo);
        else setShowDelete(false);
      },
    });
  };

  return (
    <>
      {variant === "full" ? (
        <div className="row-sm border-stroke mt-4 justify-end border-t pt-4">
          <Button variant="outline" size="sm" href={postEditPath(postId)}>
            <Pencil size={14} strokeWidth={2.5} />
            {t("editPost")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-state-error"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 size={14} strokeWidth={2.5} />
            {t("deletePost")}
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="text-state-error"
          onClick={() => setShowDelete(true)}
        >
          <Trash2 size={14} strokeWidth={2.5} />
          {tCommon("delete")}
        </Button>
      )}

      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title={tCommon("confirmDelete")}
      >
        <p className="text-muted text-(length:--type-sm) leading-normal">
          {description ?? t("deletePostDesc")}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setShowDelete(false)}>
            {tCommon("cancel")}
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleteMutation.isPending}>
            <Trash2 size={16} strokeWidth={2.5} />
            {tCommon("delete")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
