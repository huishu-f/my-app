import type { PageHeaderProps } from "@my-app/shared";

export function PageHeader({ title, subtitle, actions, className = "" }: PageHeaderProps) {
  return (
    <header
      className={`page-header animate-fade-in ${actions ? "page-actions" : ""} ${className}`.trim()}
    >
      <div>
        {typeof title === "string" ? (
          <h1 className="page-title max-md:page-title-mobile">{title}</h1>
        ) : (
          title
        )}
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="row-md">{actions}</div>}
    </header>
  );
}
