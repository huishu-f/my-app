import type { AlertProps, AlertVariant } from "@my-app/shared";

const variantClass: Record<AlertVariant, string> = {
  info: "alert-info",
  success: "alert-success",
  warning: "alert-warning",
  error: "alert-error",
};

export function Alert({ variant, icon, children, visible = true, className = "" }: AlertProps) {
  return (
    <div
      role={variant === "error" || variant === "warning" ? "alert" : "status"}
      className={`row-sm rounded-lg px-3.5 py-2.5 text-(length:--type-xs) leading-normal shadow-[inset_0_0_0_1px_var(--alert-ring)] ${variantClass[variant]} ${visible ? "flex" : "hidden"} ${className}`}
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
