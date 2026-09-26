"use client";

import { useActionState, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Mail, Lock, Clock, User, UserPlus, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { PasswordToggle } from "@/components/auth/PasswordToggle";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { msg } from "@/lib/message";
import { notify } from "@/lib/toast";
import {
  actionFailure,
  focusFirstInvalid,
  hasFeedback,
  resolveSubmitError,
  validateFieldValue,
  validateForm,
  type ErrorFeedbackOptions,
  type FieldErrors,
} from "@/lib/formFeedback";
import { registerAction } from "@server/auth/auth.controller";
import { registerSchema } from "@my-app/shared";
import type { FieldId, FieldState } from "@my-app/shared";

const initialField: FieldState = { value: "", touched: false, valid: null, error: null };

interface RegisterState {
  error: string | null;
}

const initialState: RegisterState = { error: null };

const fieldOrder: readonly FieldId[] = ["firstName", "lastName", "username", "email", "password"];

const fieldSchemas = {
  firstName: registerSchema.shape.firstName,
  lastName: registerSchema.shape.lastName,
  username: registerSchema.shape.username,
  email: registerSchema.shape.email,
  password: registerSchema.shape.password,
};

export default function RegisterPage() {
  const router = useRouter();

  const t = useTranslations("auth");

  const [fields, setFields] = useState<Record<FieldId, FieldState>>({
    firstName: { ...initialField },
    lastName: { ...initialField },
    username: { ...initialField },
    email: { ...initialField },
    password: { ...initialField },
  });

  const [showPassword, setShowPassword] = useState(false);

  const fieldMessage: Record<FieldId, string> = {
    firstName: t("errNameLength"),
    lastName: t("errNameLength"),
    username: t("errUsername"),
    email: t("invalidEmail"),
    password: t("errPassword"),
  };

  const updateField = (id: FieldId, value: string) => {
    setFields((prev) => {
      const next = { ...prev };
      if (value.length === 0) {
        next[id] = { value: "", touched: false, valid: null, error: null };
      } else {
        const error = validateFieldValue(fieldSchemas[id], value, fieldMessage[id]);
        next[id] = { value, touched: true, valid: error === null, error };
      }
      return next;
    });
  };

  const applyFieldErrors = (errors: FieldErrors<FieldId>) => {
    setFields((prev) => {
      const next = { ...prev };
      for (const id of fieldOrder) {
        const error = errors[id];
        if (error === undefined) continue;
        next[id] = { ...next[id], touched: true, valid: false, error };
      }
      return next;
    });
  };

  const registerErrorRules: ErrorFeedbackOptions<FieldId> = {
    fields: fieldOrder,
    fallback: msg("session", "registerFailed"),
    byStatus: {
      409: { fields: {}, form: t("duplicateAccount") },
    },
  };

  const [formState, formAction] = useActionState<RegisterState, FormData>(
    async (_prev, formData) => {
      const firstName = (formData.get("firstName") as string)?.trim() ?? "";
      const lastName = (formData.get("lastName") as string)?.trim() ?? "";
      const username = (formData.get("username") as string)?.trim() ?? "";
      const email = (formData.get("email") as string)?.trim() ?? "";
      const password = (formData.get("password") as string) ?? "";

      const invalid = validateForm(
        registerSchema,
        { firstName, lastName, username, email, password },
        { messages: fieldMessage, knownFields: fieldOrder },
      );
      if (hasFeedback(invalid)) {
        applyFieldErrors(invalid.fields);
        focusFirstInvalid();
        return { error: invalid.form };
      }

      try {
        const result = await registerAction({ firstName, lastName, username, email, password });
        if (!result.ok) {
          const failed = resolveSubmitError(actionFailure(result), registerErrorRules);
          applyFieldErrors(failed.fields);
          focusFirstInvalid();
          return { error: failed.form };
        }
        notify.success(msg("session", "registered"));

        router.replace("/login");
        return { error: null };
      } catch (err) {
        const failed = resolveSubmitError(err, registerErrorRules);
        applyFieldErrors(failed.fields);
        focusFirstInvalid();
        return { error: failed.form };
      }
    },
    initialState,
  );

  const renderStatusIcon = (id: FieldId) => {
    const f = fields[id];
    if (f.valid === null) return null;
    return f.valid ? (
      <Check size={16} className="text-state-success" strokeWidth={3} />
    ) : (
      <X size={16} className="text-state-error" strokeWidth={3} />
    );
  };

  return (
    <div className="auth-card">
      <div className="mb-10">
        <h1 className="auth-title">{t("registerTitle")}</h1>
        <p className="auth-subtitle">{t("registerSubtitle")}</p>
      </div>

      {formState.error && (
        <Alert variant="error" className="mb-4">
          {formState.error}
        </Alert>
      )}

      <form action={formAction} noValidate className="auth-form-stack">
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <FormField label={t("firstName")} required error={fields.firstName.error ?? undefined}>
            <Input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="Alex"
              maxLength={50}
              autoComplete="given-name"
              value={fields.firstName.value}
              onChange={(e) => updateField("firstName", e.target.value)}
              leftIcon={<User size={18} strokeWidth={2.5} />}
              rightElement={<span>{renderStatusIcon("firstName")}</span>}
              error={fields.firstName.valid === false}
              success={fields.firstName.valid === true}
            />
          </FormField>

          <FormField label={t("lastName")} required error={fields.lastName.error ?? undefined}>
            <Input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Shu"
              maxLength={50}
              autoComplete="family-name"
              value={fields.lastName.value}
              onChange={(e) => updateField("lastName", e.target.value)}
              leftIcon={<User size={18} strokeWidth={2.5} />}
              rightElement={<span>{renderStatusIcon("lastName")}</span>}
              error={fields.lastName.valid === false}
              success={fields.lastName.valid === true}
            />
          </FormField>
        </div>

        <FormField
          label={t("username")}
          required
          hint={t("usernameHint")}
          error={fields.username.error ?? undefined}
        >
          <Input
            id="username"
            name="username"
            type="text"
            placeholder="Hui"
            maxLength={30}
            autoComplete="username"
            value={fields.username.value}
            onChange={(e) => updateField("username", e.target.value)}
            leftIcon={<UserPlus size={18} strokeWidth={2.5} />}
            rightElement={<span>{renderStatusIcon("username")}</span>}
            error={fields.username.valid === false}
            success={fields.username.valid === true}
          />
        </FormField>

        <FormField label={t("email")} required error={fields.email.error ?? undefined}>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="user@example.com"
            autoComplete="email"
            value={fields.email.value}
            onChange={(e) => updateField("email", e.target.value)}
            leftIcon={<Mail size={18} strokeWidth={2.5} />}
            rightElement={<span>{renderStatusIcon("email")}</span>}
            error={fields.email.valid === false}
            success={fields.email.valid === true}
          />
        </FormField>

        <FormField label={t("password")} required error={fields.password.error ?? undefined}>
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder={t("pwdPlaceholderMin")}
            autoComplete="new-password"
            value={fields.password.value}
            onChange={(e) => updateField("password", e.target.value)}
            leftIcon={<Lock size={18} strokeWidth={2.5} />}
            rightElement={<PasswordToggle show={showPassword} onToggle={setShowPassword} />}
            error={fields.password.valid === false}
            success={fields.password.valid === true}
          />
          <PasswordStrength password={fields.password.value} />
        </FormField>

        <SubmitButton className="mt-2 w-full">{t("registerSubmit")}</SubmitButton>
      </form>

      <div className="auth-rate-hint">
        <Clock size={14} strokeWidth={2.5} />
        <span>{t("rateLimit")}</span>
      </div>

      <div className="auth-switch">
        {t("hasAccount")}
        <Link href="/login" className="auth-switch-link">
          {t("loginNow")}
        </Link>
      </div>
    </div>
  );
}
