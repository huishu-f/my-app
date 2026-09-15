/**
 * @file SubmitButton.tsx
 * @description 表单提交按钮，利用 React 19 useFormStatus 自动获取 pending 状态
 *              必须作为 <form action={...}> 的子组件使用——useFormStatus 读取
 *              最近父级 <form> 的状态
 *              消除手动传递 loading/isPending 到提交按钮的样板代码
 */
'use client';

import { useFormStatus } from 'react-dom';
import { Button } from './Button';
import type { ButtonVariant, ButtonSize } from '@my-app/shared';

/** SubmitButton 组件入参 */
interface SubmitButtonProps {
  /** 按钮内容 */
  children: React.ReactNode;
  /** 附加样式类名 */
  className?: string;
  /** 按钮变体 */
  variant?: ButtonVariant;
  /** 按钮尺寸 */
  size?: ButtonSize;
}

/**
 * SubmitButton 表单提交按钮，自动从 useFormStatus 获取 pending 状态
 * 应作为 <form> 子组件使用（示例 <SubmitButton>登录</SubmitButton>）
 * @param props {@link SubmitButtonProps}
 */
export function SubmitButton({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
}: SubmitButtonProps) {
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
