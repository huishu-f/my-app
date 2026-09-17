/**
 * @file FormField.tsx
 * @description 表单字段包装器：统一标签、必填标记、错误与提示的排版，并自动用子控件的 id 关联 label 的 htmlFor；错误文案带 role="alert" 供读屏即时播报；子控件未设 id 时开发期打印告警
 */
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { FormFieldProps } from '@my-app/shared';

/**
 * 深度优先查找子节点中第一个带 id 的元素，作为 label 的关联目标
 * @param node 待遍历的子节点（可能是数组、ReactElement 或文本）
 * @returns 命中的控件 id；子节点均未设置 id 时返回 undefined，此时 label 退化为纯文本
 */
function findControlId(node: ReactNode): string | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const id = findControlId(child);
      if (id) return id;
    }
    return undefined;
  }
  // 只有 ReactElement 才带 props，文本/数字等节点直接跳过
  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as { props: { id?: string; children?: ReactNode } }).props;
    return props.id ?? findControlId(props.children);
  }
  return undefined;
}

/**
 * FormField 表单字段包装器
 * @param props {@link FormFieldProps} children 需为带 id 的表单控件，否则标签无法与之关联
 * @example
 * <FormField label="标题" required error={errors.title}>
 *   <Input id="post-title" value={title} onChange={onChange} />
 * </FormField>
 */
export function FormField({
  label,
  hint,
  error,
  required,
  className = '',
  children,
}: FormFieldProps) {
  const t = useTranslations('common');

  /** 从子控件反查到的 id，用于 label 的 htmlFor */
  const childId = findControlId(children);

  // 反查失败意味着 label 会退化成纯文本、点击标签无法聚焦控件——属于静默失效，开发期直接报出来
  if (!childId && label && process.env.NODE_ENV !== 'production') {
    console.warn('[FormField] 未在 children 中找到带 id 的表单控件，label 无法与其关联：', label);
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label
        htmlFor={childId}
        className="text-heading text-(length:--type-xs) leading-normal font-medium tracking-[-0.005em]"
      >
        {label}
        {/* 星号本身读不出含义，用 aria-label 承载本地化后的"必填"文案 */}
        {required && (
          <span className="text-state-error ml-1" aria-label={t('required')}>
            *
          </span>
        )}
      </label>
      {children}
      {/* role="alert" 让校验失败文案在出现瞬间被读屏播报；控件侧的 aria-invalid 由 Input 依 error 自行标注 */}
      {error && (
        <span role="alert" className="text-state-error text-(length:--type-2xs) leading-normal">
          {error}
        </span>
      )}
      {/* 错误与提示互斥：报错时不再展示 hint，避免同屏两段说明文案打架 */}
      {hint && !error && <span className="meta-text">{hint}</span>}
    </div>
  );
}
