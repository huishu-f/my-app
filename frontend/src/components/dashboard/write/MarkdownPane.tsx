"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MarkdownToolbar } from "@/components/blog/MarkdownToolbar";
import { getMarkdownRenderer } from "@/lib/markdown";

export type ViewMode = "split" | "edit" | "preview";

export const PREVIEW_DEBOUNCE_MS = 500;

export function MarkdownPane({
  content,
  onContentChange,
  error,
  viewMode,
}: {
  content: string;
  onContentChange: (value: string) => void;
  error?: string;
  viewMode: ViewMode;
}) {
  const t = useTranslations("write");

  const contentRef = useRef<HTMLTextAreaElement>(null);

  const contentRefMobile = useRef<HTMLTextAreaElement>(null);

  const contentValueRef = useRef(content);

  useEffect(() => {
    contentValueRef.current = content;
  });

  const [previewHtml, setPreviewHtml] = useState("");

  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!content || viewMode === "edit") {
      setPreviewHtml("");
      return;
    }
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      getMarkdownRenderer()
        .then((render) => render(content))
        .then((html) => setPreviewHtml(html))

        .catch(() => setPreviewHtml(content));
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [content, viewMode]);

  const insertMarkdown = useCallback(
    (before: string, after?: string, placeholder?: string) => {
      const textarea =
        contentRef.current && contentRef.current.offsetParent !== null
          ? contentRef.current
          : contentRefMobile.current;
      if (!textarea) return;
      const currentContent = contentValueRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = currentContent.substring(start, end);
      const insertText = selectedText || placeholder || "";
      const newText =
        currentContent.substring(0, start) +
        before +
        insertText +
        (after || "") +
        currentContent.substring(end);
      onContentChange(newText);

      requestAnimationFrame(() => {
        textarea.focus();
        const cursorPos = start + before.length + insertText.length;
        textarea.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [onContentChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!e.metaKey && !e.ctrlKey) return;
    if (e.key === "b") {
      e.preventDefault();
      insertMarkdown("**", "**", t("phBold"));
    } else if (e.key === "i") {
      e.preventDefault();
      insertMarkdown("*", "*", t("phItalic"));
    } else if (e.key === "k") {
      e.preventDefault();
      insertMarkdown("[", "](https://)", t("phLink"));
    }
  };

  const emptyPreviewHtml = `<span class="text-muted">${t("noContent")}</span>`;

  const sharedTextareaProps = {
    name: "content",
    "aria-label": t("contentPlaceholder"),
    placeholder: t("contentPlaceholder"),
    onKeyDown: handleKeyDown,
    value: content,
  };

  return (
    <>
      <div className="hidden grid-cols-2 gap-4 lg:grid">
        <div className="border-stroke-strong bg-card-bg input-focus-within flex flex-col rounded-xl border">
          <div className="border-stroke border-b px-3 py-2">
            <MarkdownToolbar onInsert={insertMarkdown} />
          </div>
          <textarea
            {...sharedTextareaProps}
            ref={contentRef}
            id="content"
            onChange={(e) => onContentChange(e.target.value)}
            aria-invalid={!!error}
            className="text-body placeholder:text-muted min-h-[60vh] w-full flex-1 resize-none rounded-b-xl border-0 bg-transparent px-4 py-3 font-mono text-(length:--type-sm) leading-loose focus:outline-none"
          />
        </div>
        <div className="border-stroke-strong bg-card-bg min-h-[60vh] overflow-y-auto rounded-xl border p-6">
          <div
            className="article-content text-(length:--type-base) leading-loose"
            dangerouslySetInnerHTML={{ __html: previewHtml || emptyPreviewHtml }}
          />
        </div>
      </div>

      <div className="lg:hidden">
        {viewMode === "preview" ? (
          <div
            className="article-content border-stroke-strong bg-card-bg min-h-[60vh] rounded-xl border p-6 text-(length:--type-base) leading-loose"
            dangerouslySetInnerHTML={{ __html: previewHtml || emptyPreviewHtml }}
          />
        ) : (
          <>
            <MarkdownToolbar onInsert={insertMarkdown} />
            <textarea
              {...sharedTextareaProps}
              ref={contentRefMobile}
              id="content-mobile"
              onChange={(e) => onContentChange(e.target.value)}
              aria-invalid={!!error}
              rows={20}
              className="textarea-field input-focus mt-2 min-h-100 font-mono text-(length:--type-sm) leading-loose"
            />
          </>
        )}
      </div>

      {error && (
        <span role="alert" className="text-state-error text-(length:--type-2xs) leading-normal">
          {error}
        </span>
      )}
    </>
  );
}
