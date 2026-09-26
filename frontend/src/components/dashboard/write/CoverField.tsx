"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { isSafeImageUrl } from "@my-app/shared";
import { PREVIEW_DEBOUNCE_MS } from "./MarkdownPane";

export function isCoverUrlAllowed(value: string): boolean {
  const url = value.trim();
  return url === "" || isSafeImageUrl(url);
}

export function CoverField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const t = useTranslations("write");

  const [touched, setTouched] = useState(false);

  const [previewSrc, setPreviewSrc] = useState("");

  const [previewFailed, setPreviewFailed] = useState(false);

  const allowed = isCoverUrlAllowed(value);
  const url = value.trim();

  useEffect(() => {
    if (url === "" || !allowed) {
      setPreviewSrc("");
      setPreviewFailed(false);
      return;
    }
    const timer = setTimeout(() => {
      setPreviewSrc(url);
      setPreviewFailed(false);
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [url, allowed]);

  const shownError = error ?? (touched && !allowed ? t("coverInvalid") : undefined);

  return (
    <FormField
      label={t("coverLabel")}
      hint={previewFailed ? t("coverPreviewFailed") : t("coverHint")}
      error={shownError}
    >
      <div className="row-sm">
        <Input
          id="cover-image"
          name="coverImage"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://example.com/cover.jpg"
          value={value}
          onChange={(e) => {
            onChange(e.target.value.replace(/\s+/g, ""));
          }}
          onFocus={() => setTouched(false)}
          onBlur={() => setTouched(true)}
          error={!!shownError}
          className="flex-1"
        />

        {previewSrc !== "" && !previewFailed && (
          <div className="border-stroke-strong shrink-0 overflow-hidden rounded-md border">
            <Image
              src={previewSrc}
              alt={t("coverPreview")}
              width={40}
              height={40}
              unoptimized
              referrerPolicy="no-referrer"
              onError={() => setPreviewFailed(true)}
              className="h-10 w-10 object-cover"
            />
          </div>
        )}
      </div>
    </FormField>
  );
}
