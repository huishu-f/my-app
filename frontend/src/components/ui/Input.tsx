/**
 * @file Input.tsx
 * @description 通用输入框组件，支持左右图标插槽、错误/成功状态样式
 *              React 19：ref 作为普通 prop 传递，无需 forwardRef 包装
 */
import type { InputProps } from '@my-app/shared';

/**
 * Input 通用输入框，支持 ref 作为普通 prop 传入（React 19 原生 ref as prop）
 * @param props {@link InputProps}
 */
export function Input({
  leftIcon,
  rightElement,
  error,
  success,
  className = '',
  ref,
  ...props
}: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  /** 是否拥有左侧图标或右侧附加元素 */
  const hasAffix = Boolean(leftIcon || rightElement);

  /** 输入框完整class列表，根据图标和状态动态拼接 */
  const inputClass = [
    'input-field input-focus',
    leftIcon ? 'pl-10' : '',
    rightElement ? 'pr-10' : '',
    error ? 'input-error' : success ? 'input-success' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  /* 无图标插槽时直接渲染原生 input */
  if (!hasAffix) {
    return <input ref={ref} className={inputClass} {...props} />;
  }

  /* 带图标插槽时用容器包裹 input 和图标 */
  return (
    <div className="input-icon-wrap">
      {/* 左侧图标 */}
      {leftIcon && <span className="input-icon">{leftIcon}</span>}
      <input ref={ref} className={inputClass} {...props} />
      {/* 右侧附加元素 */}
      {rightElement && (
        <span className="absolute top-1/2 right-3 -translate-y-1/2">{rightElement}</span>
      )}
    </div>
  );
}
