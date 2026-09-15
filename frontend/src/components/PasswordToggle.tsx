/**
 * @file PasswordToggle.tsx
 * @description 密码可见性切换按钮，封装 Eye/EyeOff 图标和 pwd-toggle 样式
 */
import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * PasswordToggle 组件入参
 */
interface PasswordToggleProps {
  /** 密码是否显示为明文 */
  show: boolean;
  /** 切换密码可见性回调 */
  onToggle: (show: boolean) => void;
}

/**
 * PasswordToggle 密码可见性切换按钮
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
