/**
 * @file Alert.tsx
 * @description 条状提示组件：按 variant 呈现 info/success/warning/error 配色并可带前置图标；visible=false 时仅隐藏（保留 DOM）而非卸载
 */
import type { AlertProps, AlertVariant } from '@my-app/shared';

/** 提示变体 → 配色类名映射 */
const variantClass: Record<AlertVariant, string> = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
};

/**
 * Alert 提示条
 * @param props {@link AlertProps}
 * @example
 * <Alert variant="error" icon={<Info size={16} strokeWidth={2.5} />} visible={!!pwdError}>
 *   {pwdError}
 * </Alert>
 */
export function Alert({ variant, icon, children, visible = true, className = '' }: AlertProps) {
  return (
    // 错误/警告需屏幕阅读器立即播报（role="alert"），普通信息择机播报即可（role="status"）
    <div
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}
      className={`row-sm rounded-lg px-3.5 py-2.5 text-(length:--type-xs) leading-normal shadow-[inset_0_0_0_1px_var(--alert-ring)] ${variantClass[variant]} ${visible ? 'flex' : 'hidden'} ${className}`}
    >
      {icon && (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </div>
  );
}
