import type { EmptyStateProps } from "@my-app/shared";

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`border-stroke bg-surface rounded-xl border px-6 py-10 text-center ${className}`}
      role="status"
    >
      <div className="bg-card-bg text-faint mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl">
        {icon}
      </div>
      <p className="text-heading mb-1.5 text-(length:--type-base) leading-normal font-semibold">
        {title}
      </p>
      {description && (
        <p className="text-muted mx-auto max-w-75 text-(length:--type-xs) leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
