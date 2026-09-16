/**
 * @file DeletePostButton.tsx
 * @description 文章删除按钮组：full 变体（详情页，编辑+删除）与 compact 变体（个人中心，仅删除），
 *              点击删除弹出确认弹窗，确认后调用删除接口。
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
 * DeletePostButton 组件入参
 */
interface DeletePostButtonProps extends PostIdProps {
  /** 确认弹窗描述文案 */
  description?: string;
  /** 删除成功后跳转的路径，不传则关闭弹窗 */
  redirectTo?: string;
  /** 按钮变体：full=带编辑入口的完整按钮组(详情页), compact=仅删除按钮(个人中心) */
  variant?: 'full' | 'compact';
}

/**
 * DeletePostButton 文章删除按钮组组件
 * 按变体渲染按钮组，点击删除弹确认弹窗，确认后调用删除接口并按配置跳转
 * @param props {@link DeletePostButtonProps}
 */
export function DeletePostButton({
  postId,
  description,
  redirectTo,
  variant = 'full',
}: DeletePostButtonProps) {
  /** 国际化路由实例 */
  const router = useRouter();
  /** 文章文案翻译函数 */
  const t = useTranslations('post');
  /** 通用文案翻译函数 */
  const tCommon = useTranslations('common');
  /** 删除确认弹窗显示状态 */
  const [showDelete, setShowDelete] = useState(false);
  /** 删除文章的 mutation 实例 */
  const deleteMutation = useDeletePost();

  /**
   * 确认删除处理：成功后跳转 redirectTo 或关闭弹窗；失败 toast 提示
   */
  const confirmDelete = () => {
    deleteMutation.mutate(postId, {
      onSuccess: () => {
        // replace 而非 push：文章已删除，若留历史则返回键回到详情页直接 404
        if (redirectTo) router.replace(redirectTo);
        else setShowDelete(false);
      },
      onError: () => toast.error(tCommon('deleteFailed')),
    });
  };

  return (
    <>
      {/* 按变体渲染：full=编辑+删除按钮组，compact=仅删除按钮（增删改查带语义图标：Pencil/Trash2） */}
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

      {/* 删除确认弹窗 */}
      <Modal open={showDelete} onClose={() => setShowDelete(false)} title={tCommon('confirmDelete')}>
        <p className="text-muted text-(length:--type-base) leading-normal">
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
