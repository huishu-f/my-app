function getStrength(pwd: string): number {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score += 1;
  return score;
}

function strengthColor(score: number): string {
  if (score <= 1) return "var(--color-state-error)";
  if (score === 2) return "var(--color-state-warning)";
  return "var(--color-state-success)";
}

import { useTranslations } from "next-intl";
import type { PasswordStrengthProps } from "@my-app/shared";

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const t = useTranslations("auth");

  const score = getStrength(password);
  if (!password) return null;

  const activeColor = strengthColor(score);

  return (
    <>
      <div className="mt-2 flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="ease-smooth h-1 flex-1 rounded-xs transition-colors duration-[var(--duration-fast)]"
            style={{
              background: i < score ? activeColor : "var(--color-stroke)",
            }}
          />
        ))}
      </div>
      <span className="mt-1 block text-(length:--type-2xs)" style={{ color: activeColor }}>
        {t(score <= 1 ? "strengthWeak" : score === 2 ? "strengthMedium" : "strengthStrong")}
      </span>
    </>
  );
}
