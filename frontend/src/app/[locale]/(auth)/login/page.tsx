"use client";

import { useActionState, useState, Suspense } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Clock, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { PasswordToggle } from "@/components/auth/PasswordToggle";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { msg } from "@/lib/message";
import { notify } from "@/lib/toast";
import {
  actionFailure,
  focusFirstInvalid,
  hasFeedback,
  resolveSubmitError,
  validateForm,
  type ErrorFeedbackOptions,
  type FeedbackResult,
} from "@/lib/formFeedback";
import { useAuth } from "@/components/AuthProvider";
import { loginAction } from "@server/auth/auth.controller";
import { safeRedirect } from "@/lib/navigation";
import { loginSchema } from "@my-app/shared";

interface LoginState {
  emailError: string | null;

  pwdError: string | null;

  formError: string | null;
}

type LoginField = "email" | "password";

const initialState: LoginState = { emailError: null, pwdError: null, formError: null };

function toLoginState(feedback: FeedbackResult<LoginField>): LoginState {
  return {
    emailError: feedback.fields.email ?? null,
    pwdError: feedback.fields.password ?? null,
    formError: feedback.form,
  };
}

function LoginContent() {
  const t = useTranslations("auth");

  const searchParams = useSearchParams();

  const { refreshMe } = useAuth();
  const router = useRouter();

  const redirectRaw = searchParams.get("redirect") || "/";

  const safeR = safeRedirect(redirectRaw);

  const [showPassword, setShowPassword] = useState(false);

  const [values, setValues] = useState({ email: "", password: "" });

  const hasRedirect = searchParams.has("redirect");

  const loginErrorRules: ErrorFeedbackOptions<LoginField> = {
    fields: ["email", "password"],
    fallback: msg("session", "loginFailed"),
    byStatus: {
      401: { fields: {}, form: t("emailOrPwdError") },
      403: { fields: { email: t("accountDisabled") }, form: null },
    },
  };

  const [formState, formAction] = useActionState<LoginState, FormData>(async (_prev, formData) => {
    const email = (formData.get("email") as string)?.trim() ?? "";
    const password = (formData.get("password") as string) ?? "";

    const invalid = validateForm(
      loginSchema,
      { email, password },
      { messages: { email: t("invalidEmail"), password: t("emptyPwd") } },
    );
    if (hasFeedback(invalid)) {
      focusFirstInvalid();
      return toLoginState(invalid);
    }

    try {
      const result = await loginAction({ email, password });
      if (!result.ok) {
        const failed = resolveSubmitError(actionFailure(result), loginErrorRules);
        focusFirstInvalid();
        return toLoginState(failed);
      }
      try {
        await refreshMe();
      } catch {
        notify.error(msg("session", "loginFailed"));
      }
      notify.success(msg("session", "loggedIn"));

      router.replace(safeR);
      return initialState;
    } catch (err) {
      const failed = resolveSubmitError(err, loginErrorRules);
      focusFirstInvalid();
      return toLoginState(failed);
    }
  }, initialState);

  return (
    <div className="auth-card">
      <div className="mb-10">
        <h1 className="auth-title">{t("loginTitle")}</h1>
        <p className="auth-subtitle">{t("loginSubtitle")}</p>
      </div>

      {hasRedirect && (
        <Alert variant="info" icon={<Info size={18} strokeWidth={2.5} />} className="mb-5">
          {t("redirectNotice")}
        </Alert>
      )}

      {formState.formError && (
        <Alert variant="error" className="mb-5">
          {formState.formError}
        </Alert>
      )}

      <form action={formAction} noValidate className="auth-form-stack">
        <FormField label={t("email")} error={formState.emailError ?? undefined}>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="user@example.com"
            autoComplete="email"
            value={values.email}
            onChange={(e) => setValues((prev) => ({ ...prev, email: e.target.value }))}
            leftIcon={<Mail size={18} strokeWidth={2.5} />}
            error={!!formState.emailError}
          />
        </FormField>

        <FormField label={t("password")} error={formState.pwdError ?? undefined}>
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder={t("pwdPlaceholder")}
            autoComplete="current-password"
            value={values.password}
            onChange={(e) => setValues((prev) => ({ ...prev, password: e.target.value }))}
            leftIcon={<Lock size={18} strokeWidth={2.5} />}
            rightElement={<PasswordToggle show={showPassword} onToggle={setShowPassword} />}
            error={!!formState.pwdError}
          />
        </FormField>

        <div className="text-right">
          <span
            className="text-muted text-(length:--type-2xs)"
            aria-disabled="true"
            title={t("forgotPwd")}
          >
            {t("forgotPwd")}
          </span>
        </div>

        <SubmitButton className="mt-2 w-full">{t("loginSubmit")}</SubmitButton>
      </form>

      <div className="auth-rate-hint">
        <Clock size={14} strokeWidth={2.5} />
        <span>{t("rateLimit")}</span>
      </div>

      <div className="auth-switch">
        {t("noAccount")}
        <Link href="/register" className="auth-switch-link">
          {t("registerNow")}
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
