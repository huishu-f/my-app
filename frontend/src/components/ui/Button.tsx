/**
 * @file Button.tsx
 * @description 统一按钮：传 href 渲染为带语言前缀的 Link，否则渲染原生 button；variant/size 取预设枚举，loading 时显示 Spinner 并屏蔽点击。仅负责外观与加载态，不含提交逻辑
 */
import { Link } from '@/i18n/navigation';
import type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
  ButtonAsButton,
  ButtonAsLink,
} from '@my-app/shared';
import { Spinner } from './Spinner';

/** 按钮变体 → 主题配色类名 */
const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  outline: 'btn-outline',
  danger: 'btn-danger',
};

/** 尺寸档位 → 高度（h）、水平内边距（px）、圆角与字号类名 */
const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 rounded-md text-(length:--type-xs) leading-normal',
  md: 'h-9 px-4 rounded-md text-(length:--type-xs) leading-normal',
  lg: 'h-10 px-6 rounded-md text-(length:--type-sm) leading-normal',
};

/** 全变体共用基础类：居中对齐、文案不换行、颜色/阴影过渡（150ms）与禁用/aria-disabled 时压制交互 */
const baseClass =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-[background-color,color,border-color,box-shadow,opacity] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none &[aria-disabled='true']:opacity-50 &[aria-disabled='true']:pointer-events-none";

/**
 * Button 按钮（button / link 多态）
 * @param props {@link ButtonProps} 以 href 是否存在区分形态；ref 可选，用于外部聚焦或测量
 * @example
 * <Button variant="danger" loading={saving} onClick={handleDelete}>删除</Button>
 * <Button href="/posts" size="lg">查看全部文章</Button>
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
  const cls = `${baseClass} ${variantClass[variant]} ${sizeClass[size]} ${className}`;

  // 链接分支：a 标签无原生 disabled，只能靠 aria-disabled 表达状态并拦截默认跳转
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

  // 按钮分支：loading 与调用方 disabled 合并成真实 disabled，表单与无障碍能正确识别不可用
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
