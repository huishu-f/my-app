/**
 * @file SubmitButton.tsx
 * @description 表单提交按钮：用 useFormStatus 读取所在 <form> 的提交中状态并自动接管 loading/disabled；必须作为表单子组件渲染（配合 Server Action），调用方不要再传 loading
 */
'use client';

import { useFormStatus } from 'react-dom';
import { Button } from './Button';
import type { ButtonVariant, ButtonSize } from '@my-app/shared';

/**
 * SubmitButton 组件入参
 */
interface SubmitButtonProps {
  /** 按钮文案 */
  children: React.ReactNode;

  /** 自定义样式类名 */
  className?: string;

  /** 按钮样式变体，默认 'primary' */
  variant?: ButtonVariant;

  /** 按钮尺寸，默认 'md' */
  size?: ButtonSize;
}

/**
 * SubmitButton 提交按钮
 * @param props {@link SubmitButtonProps}
 * @example
 * <form action={savePost}>
 *   <SubmitButton>发布</SubmitButton>
 * </form>
 */
export function SubmitButton({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
}: SubmitButtonProps) {
  /** 外层 form 的提交中状态，仅在本组件作为表单子组件渲染时有效 */
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      loading={pending}
      disabled={pending}
      variant={variant}
      size={size}
      className={className}
    >
      {children}
    </Button>
  );
}
