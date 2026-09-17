/**
 * @file PasswordToggle.tsx
 * @description 密码可见性切换按钮：在明文/密文之间切换，图标与无障碍标签随当前状态联动
 */
import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * PasswordToggle 组件入参
 */
interface PasswordToggleProps {
  /** 当前是否以明文显示密码 */
  show: boolean;

  /** 切换可见性的回调，参数为切换后的目标状态 */
  onToggle: (show: boolean) => void;
}

/**
 * PasswordToggle 密码显隐切换按钮
 * @param props {@link PasswordToggleProps}
 */
export function PasswordToggle({ show, onToggle }: PasswordToggleProps) {
  const t = useTranslations('auth');
  return (
    <button
      type="button"
      onClick={() => onToggle(!show)}
      aria-label={show ? t('hidePassword') : t('showPassword')}
      className="pwd-toggle"
    >
      {show ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
    </button>
  );
}
