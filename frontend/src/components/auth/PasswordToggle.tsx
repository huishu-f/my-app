import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

interface PasswordToggleProps {
  show: boolean;

  onToggle: (show: boolean) => void;
}

export function PasswordToggle({ show, onToggle }: PasswordToggleProps) {
  const t = useTranslations("auth");
  return (
    <button
      type="button"
      onClick={() => onToggle(!show)}
      aria-label={show ? t("hidePassword") : t("showPassword")}
      className="pwd-toggle"
    >
      {show ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
    </button>
  );
}
