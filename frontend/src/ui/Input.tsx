/**
 * @file Input.tsx
 * @description 输入框：透传原生 input 全部属性，附加左右插槽与 error/success 状态描边，error 时自动标注 aria-invalid；有插槽时多包一层绝对定位容器，无插槽时直接渲染裸 input
 */
import type { InputProps } from '@my-app/shared';

/**
 * Input 输入框
 * @param props {@link InputProps} 未识别的原生属性直接透传给 input；ref 可选，供外部聚焦
 * @example
 * <Input id="email" leftIcon={<Mail size={16} strokeWidth={2.5} />} error={!emailValid} value={email} onChange={onChange} />
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
  /** 是否存在左右插槽，决定要不要额外包一层定位容器 */
  const hasAffix = Boolean(leftIcon || rightElement);

  /** 拼装类名：有插槽时预留 pl-10/pr-10 让文字避开绝对定位的图标；error 优先于 success */
  const inputClass = [
    'input-field input-focus',
    leftIcon ? 'pl-10' : '',
    rightElement ? 'pr-10' : '',
    error ? 'input-error' : success ? 'input-success' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  /**
   * 无障碍标记：错误态光有视觉描边（input-error）不够，还需 aria-invalid 让读屏知道"当前字段有误"；
   * 置于 props 之前展开，调用方显式传入同名属性时仍可覆盖
   */
  const inputProps = { 'aria-invalid': error || undefined, ...props };

  // 无插槽时不包 wrapper，避免多余的 div 打断外层 flex/grid 与宽度继承
  if (!hasAffix) {
    return <input ref={ref} className={inputClass} {...inputProps} />;
  }

  return (
    <div className="input-icon-wrap">
      {leftIcon && <span className="input-icon">{leftIcon}</span>}
      <input ref={ref} className={inputClass} {...inputProps} />
      {/* 右侧插槽常放密码显隐等可交互元素，不做绝对定位图标那套装饰性处理 */}
      {rightElement && (
        <span className="absolute top-1/2 right-3 -translate-y-1/2">{rightElement}</span>
      )}
    </div>
  );
}
