import type { StatsGridProps } from "@my-app/shared";

export function StatsGrid({ items, className = "" }: StatsGridProps) {
  return (
    <div className={`stats-grid ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="stat-item">
          <div className="stat-value">{item.value}</div>
          <div className="stat-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
