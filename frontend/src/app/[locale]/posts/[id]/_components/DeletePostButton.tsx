/**
 * @file DeletePostButton.tsx
 * @description 删除文章按钮：弹出二次确认框，确认后调用删除接口；支持 full（编辑+删除并排）与 compact（仅删除）两种形态，可选删除后跳转
 */
'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Trash2, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from '@/lib/toast';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useDeletePost } from '@/services/blog/hooks';
import type { PostIdProps } from '@my-app/shared';

/**
 * DeletePostButton 组件入参（继承 PostIdProps 的 postId）
 */
interface DeletePostButtonProps extends PostIdProps {
  /** 确认框描述文案，缺省时使用默认的删除文章提示 */
  description?: string;

  /** 删除成功后跳转的目标路径；缺省时仅关闭弹窗不跳转 */
  redirectTo?: string;

  /** 按钮形态：full 含编辑+删除并排，compact 仅删除按钮，默认 'full' */
  variant?: 'full' | 'compact';

  /** 删除成功后的回调（在跳转/关窗前触发），供列表场景本地移除该项 */
  onRemoved?: () => void;
}

/**
 * DeletePostButton 删除文章按钮
 * @param props {@link DeletePostButtonProps}
 */
export function DeletePostButton({
  postId,
  description,
  redirectTo,
  variant = 'full',
  onRemoved,
}: DeletePostButtonProps) {
  const router = useRouter();

  const t = useTranslations('post');

  const tCommon = useTranslations('common');

  /** 删除确认弹窗是否可见 */
  const [showDelete, setShowDelete] = useState(false);

  /** 删除文章请求，暴露 isPending 供按钮展示加载态 */
  const deleteMutation = useDeletePost();

  /**
   * 确认删除：成功后先通知 onRemoved（列表本地移除），再看是否有 redirectTo 跳转，否则仅关闭弹窗；失败弹错误提示
   */
  const confirmDelete = () => {
    deleteMutation.mutate(postId, {
      onSuccess: () => {
        onRemoved?.();
        if (redirectTo) router.replace(redirectTo);
        else setShowDelete(false);
      },
      onError: () => toast.error(tCommon('deleteFailed')),
    });
  };

  return (
    <>
      {variant === 'full' ? (
        <div className="row-sm border-stroke mt-4 border-t pt-4">
          <Button variant="ghost" size="sm" href={`/write?id=${postId}`}>
            <Pencil size={14} strokeWidth={2.5} />
            {t('editPost')}
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
            <Trash2 size={14} strokeWidth={2.5} />
            {t('deletePost')}
          </Button>
        </div>
      ) : (
        <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
          <Trash2 size={14} strokeWidth={2.5} />
          {tCommon('delete')}
        </Button>
      )}

      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title={tCommon('confirmDelete')}
      >
        <p className="text-muted text-(length:--type-sm) leading-normal">
          {description ?? t('deletePostDesc')}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setShowDelete(false)}>
            {tCommon('cancel')}
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleteMutation.isPending}>
            <Trash2 size={16} strokeWidth={2.5} />
            {tCommon('delete')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
