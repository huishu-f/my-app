/**
 * @file Spinner.tsx
 * @description 加载中转圈指示器：四边等宽描边中把右侧一条设为透明，配合 animate-spin 形成旋转缺口环；本身 aria-hidden 属纯装饰，需外层提供 aria-busy 或可见文案，尺寸只有 sm/md/lg 三档
 */
/** 尺寸档位 → 圆环直径（h/w 类）与环线宽 */
const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-[2.5px]',
  // 整页占位用大档：环越大线宽越要收，2px 才不会显笨重
  lg: 'h-8 w-8 border-2',
};

import type { SpinnerProps } from '@my-app/shared';

/**
 * Spinner 加载指示器
 * @param props {@link SpinnerProps}
 * @example
 * <Spinner size="sm" className="text-primary" />
 */
export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    // 右侧边框透明才露出缺口，配合 animate-spin 看起来像在转的环；走 border-r-transparent 类而非内联样式
    <span
      className={`${sizeMap[size]} inline-block animate-spin rounded-full border-current border-r-transparent ${className}`}
      aria-hidden="true"
    />
  );
}
