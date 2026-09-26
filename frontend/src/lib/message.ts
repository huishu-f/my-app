import type { ValidationRule } from "@my-app/shared";
import zhFeedback from "@/i18n/messages/zh/feedback";
import enFeedback from "@/i18n/messages/en/feedback";

export type MsgLocale = "zh" | "en";

export type MsgParams = Record<string, string | number>;

const PLACEHOLDER = /\{(\w+)\}/g;

type FeedbackShape = typeof zhFeedback;

const FEEDBACK: { readonly zh: FeedbackShape; readonly en: FeedbackShape } = {
  zh: zhFeedback,
  en: enFeedback,
};

export type MsgGroup = keyof FeedbackShape;

export type MsgKey<G extends MsgGroup> = keyof FeedbackShape[G];

type GroupStrings<G extends MsgGroup> = { [K in keyof FeedbackShape[G]]: string };

export function currentMsgLocale(): MsgLocale {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/en")) return "en";
  return "zh";
}

function formatMsg(template: string, params?: MsgParams): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER, (raw, name: string) => {
    const value = params[name];
    if (value === undefined || value === null) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[message] 缺少占位符参数 ${raw}`);
      }
      return raw;
    }
    return String(value);
  });
}

export function msg<G extends MsgGroup>(
  group: G,
  key: MsgKey<G>,
  params?: MsgParams,
  locale: MsgLocale = currentMsgLocale(),
): string {
  const groupDict = FEEDBACK[locale][group] as GroupStrings<G>;
  return formatMsg(groupDict[key], params);
}

export type EntityKey = keyof FeedbackShape["entity"];

export function entityName(name: EntityKey, locale: MsgLocale = currentMsgLocale()): string {
  return FEEDBACK[locale].entity[name];
}

function fieldName(name: string, locale: MsgLocale = currentMsgLocale()): string | undefined {
  const dict: Record<string, string> = FEEDBACK[locale].field;
  return dict[name];
}

const STATUS_MESSAGES: Record<number, { group: MsgGroup; key: string }> = {
  0: { group: "common", key: "networkError" },
  401: { group: "common", key: "sessionExpired" },
  403: { group: "common", key: "forbidden" },
  404: { group: "common", key: "contentGone" },
  408: { group: "common", key: "timeout" },
  429: { group: "common", key: "rateLimited" },
  500: { group: "common", key: "unknownError" },
};

function statusOf(err: unknown): number | null {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : null;
}

export function errorToMsg(
  err: unknown,
  locale: MsgLocale = currentMsgLocale(),
  fallback?: string,
): string {
  const status = statusOf(err);
  if (status === null) return fallback ?? msg("common", "unknownError", undefined, locale);
  const mapped = STATUS_MESSAGES[status];

  if (mapped) return msg(mapped.group, mapped.key as never, undefined, locale);

  if (status < 500) return msg("common", "actionFailed", undefined, locale);
  return msg("common", "unknownError", undefined, locale);
}

export function detailToMsg(
  detail: {
    path: string;
    code?: string;
    rule?: ValidationRule;
    params?: { min?: number; max?: number };
  },
  locale: MsgLocale = currentMsgLocale(),
): string {
  const label = fieldName(detail.path, locale);
  const invalid = msg("form", "invalidField", undefined, locale);

  if (detail.rule) {
    switch (detail.rule) {
      case "imageUrl":
        return msg("form", "imageUrl", undefined, locale);
      case "nonBlank":
        return label ? msg("form", "requiredInput", { field: label }, locale) : invalid;
      case "passwordMismatch":
        return msg("form", "sameAsCurrent", undefined, locale);
    }
  }

  switch (detail.code) {
    case "too_small": {
      if (!label) return invalid;
      const min = detail.params?.min ?? 1;
      return min <= 1
        ? msg("form", "requiredInput", { field: label }, locale)
        : msg("form", "tooShort", { field: label, min }, locale);
    }
    case "too_big": {
      const max = detail.params?.max;
      if (!label || max === undefined) return invalid;
      return msg("form", "tooLong", { field: label, max }, locale);
    }
    default:
      return label ? msg("form", "format", { field: label }, locale) : invalid;
  }
}
