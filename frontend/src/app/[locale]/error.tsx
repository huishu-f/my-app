"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import type { ErrorBoundaryProps } from "@my-app/shared";

export default function Error({ error, reset }: ErrorBoundaryProps) {
  const t = useTranslations("errors");

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  const copyError = () => {
    const text = `${error.name}: ${error.message}\n${error.stack || ""}\nURL: ${typeof window !== "undefined" ? window.location.href : ""}`;
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);

        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <Container className="page-section">
      <div className="animate-fade-in flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="display-serif text-heading mb-5 text-(length:--type-3xl) leading-tight font-bold">
          {t("errorTitle")}
        </h1>
        <p className="text-muted mb-10 max-w-100 text-(length:--type-base) leading-relaxed">
          {t("errorDesc")}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset}>{t("reload")}</Button>
          <Button variant="ghost" href="/">
            {t("goHome")}
          </Button>
          <Button variant="ghost" onClick={copyError}>
            {copied ? t("copied") : t("copyError")}
          </Button>
        </div>
      </div>
    </Container>
  );
}
