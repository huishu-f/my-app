/**
 * @file Button.tsx
 * @description 通用按钮组件，支持 primary/ghost/outline/danger 四种变体和多尺寸，可根据 href 自动渲染为链接
 *              React 19：ref 作为普通 prop 传递，无需 forwardRef 包装
 */
import Link from 'next/link';
import type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
  ButtonAsButton,
  ButtonAsLink,
} from '@my-app/shared';
import { Spinner } from './Spinner';

/** 按钮变体与 CSS 类名的映射表 */
const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  outline: 'btn-outline',
  danger: 'btn-danger',
};

/** 按钮尺寸与 CSS 类名的映射表 — 严格遵循 shadcn 尺寸规范，统一圆角 rounded-lg */
const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 rounded-lg text-(length:--type-sm) leading-normal',
  md: 'h-10 px-4 rounded-lg text-(length:--type-base) leading-normal',
  lg: 'h-11 px-6 rounded-lg text-(length:--type-md) leading-normal',
};

/** 按钮基础样式，含布局、过渡动画和禁用态；whitespace-nowrap 防英文长文案在按钮内折行（溢出交给外层容器 flex-wrap） */
const baseClass =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] &[aria-disabled='true']:opacity-50 &[aria-disabled='true']:pointer-events-none";

/**
 * Button 通用按钮，支持 ref 作为普通 prop 传入（React 19 原生 ref as prop）
 * @param props {@link ButtonProps}
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className = '',
  children,
  ref,
  ...props
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement | HTMLAnchorElement> }) {
  /** 合并后的按钮完整class */
  const cls = `${baseClass} ${variantClass[variant]} ${sizeClass[size]} ${className}`;

  /* 当传入 href 时渲染为 Next.js Link */
  if (props.href) {
    const { href, ...anchorProps } = props as ButtonAsLink;
    return (
      <Link
        href={href}
        className={cls}
        ref={ref as React.Ref<HTMLAnchorElement>}
        aria-busy={loading}
        aria-disabled={loading}
        onClick={loading ? (e) => e.preventDefault() : undefined}
        {...anchorProps}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </Link>
    );
  }

  /* 渲染为原生 button */
  const { ...buttonProps } = props as ButtonAsButton;
  return (
    <button
      className={cls}
      disabled={loading || (props as ButtonAsButton).disabled}
      aria-busy={loading}
      ref={ref as React.Ref<HTMLButtonElement>}
      {...buttonProps}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
