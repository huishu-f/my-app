import { Link } from "@/i18n/navigation";
import type {
  ButtonProps,
  ButtonVariant,
  ButtonSize,
  ButtonAsButton,
  ButtonAsLink,
} from "@my-app/shared";
import { Spinner } from "./Spinner";

const variantClass: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  outline: "btn-outline",
  danger: "btn-danger",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-8 px-3 rounded-md text-(length:--type-xs) leading-normal",
  md: "h-9 px-4 rounded-md text-(length:--type-xs) leading-normal",
  lg: "h-10 px-6 rounded-md text-(length:--type-sm) leading-normal",
};

const baseClass =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-[background-color,color,border-color,box-shadow,opacity] duration-[var(--duration-fast)] ease-smooth disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none &[aria-disabled='true']:opacity-50 &[aria-disabled='true']:pointer-events-none";

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className = "",
  children,
  ref,
  ...props
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement | HTMLAnchorElement> }) {
  const cls = `${baseClass} ${variantClass[variant]} ${sizeClass[size]} ${className}`;

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
        {loading && <Spinner size="sm" aria-hidden="true" />}
        {children}
      </Link>
    );
  }

  const { ...buttonProps } = props as ButtonAsButton;
  return (
    <button
      className={cls}
      disabled={loading || (props as ButtonAsButton).disabled}
      aria-busy={loading}
      ref={ref as React.Ref<HTMLButtonElement>}
      {...buttonProps}
    >
      {loading && <Spinner size="sm" aria-hidden="true" />}
      {children}
    </button>
  );
}
