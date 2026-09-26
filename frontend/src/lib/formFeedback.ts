import type { z } from "zod";
import { ApiRequestError, formatZodIssues, type ValidationErrorDetail } from "@my-app/shared";
import { notify } from "@/lib/toast";
import { currentMsgLocale, detailToMsg, errorToMsg } from "@/lib/message";

export type FieldErrors<F extends string> = Partial<Record<F, string>>;

export interface FeedbackResult<F extends string> {
  fields: FieldErrors<F>;

  form: string | null;
}

interface ErrorFeedback<F extends string> extends FeedbackResult<F> {
  toastMessage: string | null;
}

type StatusOverride<F extends string> = FeedbackResult<F> | { toast: string };

export interface ErrorFeedbackOptions<F extends string> {
  fields: readonly F[];

  fallback: string;

  byStatus?: Record<number, StatusOverride<F>>;
}

const FORM_LEVEL_STATUSES = new Set([400, 409, 422]);

function separator(): string {
  return currentMsgLocale() === "en" ? "; " : "；";
}

function classifyError<F extends string>(
  err: unknown,
  options: ErrorFeedbackOptions<F>,
): ErrorFeedback<F> {
  const { fields: knownFields, fallback, byStatus } = options;
  const empty: ErrorFeedback<F> = { fields: {}, form: null, toastMessage: null };

  const apiError = err instanceof ApiRequestError ? err : null;

  const override = apiError ? byStatus?.[apiError.status] : undefined;
  if (override) {
    if ("toast" in override) return { fields: {}, form: null, toastMessage: override.toast };
    return { ...override, toastMessage: null };
  }

  if (apiError && FORM_LEVEL_STATUSES.has(apiError.status)) {
    const fields: FieldErrors<F> = {};
    const orphans: string[] = [];
    for (const detail of apiError.details ?? []) {
      const text = detailToMsg(detail);
      const field = detail.path as F;
      if (knownFields.includes(field)) fields[field] ??= text;
      else orphans.push(text);
    }

    const hasDetails = (apiError.details?.length ?? 0) > 0;
    const form = orphans.length ? orphans.join(separator()) : hasDetails ? null : fallback;
    return { fields, form, toastMessage: null };
  }

  const plainError = err instanceof Error ? err : new Error(String(err));
  return {
    ...empty,
    toastMessage: errorToMsg(plainError, currentMsgLocale(), fallback || undefined),
  };
}

export function resolveSubmitError<F extends string>(
  err: unknown,
  options: ErrorFeedbackOptions<F>,
): FeedbackResult<F> {
  const outcome = classifyError(err, options);
  if (outcome.toastMessage) notify.fail(outcome.toastMessage);
  return { fields: outcome.fields, form: outcome.form };
}

export function actionFailure(result: {
  status: number;
  message: string;
  details?: ValidationErrorDetail[];
}): ApiRequestError {
  return new ApiRequestError(result.status, result.status, result.message, result.details);
}

export function validateForm<F extends string>(
  schema: z.ZodType,
  values: unknown,
  options: { messages?: Partial<Record<F, string>>; knownFields?: readonly F[] } = {},
): FeedbackResult<F> {
  const result = schema.safeParse(values);
  if (result.success) return { fields: {}, form: null };

  const { messages, knownFields } = options;
  const fields: FieldErrors<F> = {};
  const orphans: string[] = [];

  for (const detail of formatZodIssues(result.error.issues)) {
    const field = detail.path as F;
    if (field && (!knownFields || knownFields.includes(field))) {
      fields[field] ??= messages?.[field] ?? detailToMsg(detail);
    } else {
      orphans.push(detailToMsg(detail));
    }
  }

  return { fields, form: orphans.length ? orphans.join(separator()) : null };
}

export function validateFieldValue(
  fieldSchema: z.ZodType,
  value: unknown,
  message?: string,
): string | null {
  const result = fieldSchema.safeParse(value);
  if (result.success) return null;
  const [detail] = formatZodIssues(result.error.issues);
  return message ?? (detail ? detailToMsg(detail) : null);
}

export function focusFirstInvalid(): void {
  if (typeof document === "undefined") return;
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}

export function hasFeedback<F extends string>(result: FeedbackResult<F>): boolean {
  return Object.keys(result.fields).length > 0 || !!result.form;
}
