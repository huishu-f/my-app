/**
 * @file StatsGrid.tsx
 * @description 统计网格：按 items 顺序渲染「数值 + 标签」卡片，.stats-grid 固定三列等分并带竖向分隔线，统计项以 3 个为宜（不足会留空格子）；items 为空时只留空容器，加载与空态需调用方自行处理
 */
import type { StatsGridProps } from '@my-app/shared';

/**
 * StatsGrid 统计网格
 * @param props {@link StatsGridProps}
 * @example
 * <StatsGrid
 *   items={[
 *     { label: '文章', value: '12' },
 *     { label: '获赞', value: '348' },
 *     { label: '浏览', value: '5.2k' },
 *   ]}
 * />
 */
export function StatsGrid({ items, className = '' }: StatsGridProps) {
  return (
    <div className={`stats-grid ${className}`}>
      {/* StatItem 没有唯一 id，统计项为静态配置且顺序固定，故用 index 作 key */}
      {items.map((item, index) => (
        <div key={index} className="stat-item">
          <div className="stat-value">{item.value}</div>
          <div className="stat-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
