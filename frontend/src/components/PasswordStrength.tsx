/**
 * @file PasswordStrength.tsx
 * @description 密码强度指示条：按长度、大小写混合、数字+符号三条规则计算 0-3 分，渲染分段色条与强度文案
 */
/**
 * 计算密码强度评分
 * @param pwd 待评估的密码明文
 * @returns 0-3 的整数分：空为 0；长度≥6、大小写混合、含数字且含符号 各加 1 分
 */
function getStrength(pwd: string): number {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score += 1;
  return score;
}

/**
 * 将强度评分映射为对应的状态色 token
 * @param score {@link getStrength} 返回的 0-3 评分
 * @returns 弱(≤1)红、中(2)黄、强(3)绿对应的 CSS 变量
 */
function strengthColor(score: number): string {
  if (score <= 1) return 'var(--color-state-error)';
  if (score === 2) return 'var(--color-state-warning)';
  return 'var(--color-state-success)';
}

import { useTranslations } from 'next-intl';
import type { PasswordStrengthProps } from '@my-app/shared';

/**
 * PasswordStrength 密码强度条
 * 密码为空时不渲染任何内容。
 * @param props {@link PasswordStrengthProps}（类型由 @my-app/shared 提供）
 */
export function PasswordStrength({ password }: PasswordStrengthProps) {
  const t = useTranslations('auth');

  const score = getStrength(password);
  if (!password) return null;

  const activeColor = strengthColor(score);

  return (
    <>
      <div className="mt-2 flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-xs transition-colors duration-150 ease-out"
            style={{
              background: i < score ? activeColor : 'var(--color-stroke)',
            }}
          />
        ))}
      </div>
      <span className="mt-1 block text-(length:--type-2xs)" style={{ color: activeColor }}>
        {t(score <= 1 ? 'strengthWeak' : score === 2 ? 'strengthMedium' : 'strengthStrong')}
      </span>
    </>
  );
}
