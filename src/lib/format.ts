import type { Locale } from "@/i18n/config";

const INTL_LOCALE: Record<Locale, string> = { zh: "zh-CN", en: "en-US" };

const RELATIVE_FORMAT: Record<Locale, Intl.RelativeTimeFormat> = {
  zh: new Intl.RelativeTimeFormat(INTL_LOCALE.zh, { numeric: "auto" }),
  en: new Intl.RelativeTimeFormat(INTL_LOCALE.en, { numeric: "auto" }),
};

export function getInitials(firstName: string, lastName: string): string {
  const name = (firstName || lastName || "").trim();
  return (name.charAt(0) || "U").toUpperCase();
}

export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.split(" ");
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ") || "",
  };
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatDate(dateStr: string, locale: Locale = "zh"): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatRelativeTime(dateStr: string, locale: Locale = "zh"): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const rtf = RELATIVE_FORMAT[locale];
  const diff = Date.now() - d.getTime();

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);

  if (minutes < 1) return rtf.format(0, "second");
  if (minutes < 60) return rtf.format(-minutes, "minute");
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 7) return rtf.format(-days, "day");
  if (days < 30) return rtf.format(-Math.floor(days / 7), "week");
  return formatDate(dateStr, locale);
}
