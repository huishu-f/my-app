"use client";

import { Container } from "@/components/ui/Container";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { Eye, Pencil, Check, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { entityName, msg } from "@/lib/message";
import { notify } from "@/lib/toast";
import {
  focusFirstInvalid,
  resolveSubmitError,
  validateForm,
  type ErrorFeedbackOptions,
  type FieldErrors,
} from "@/lib/formFeedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/layouts/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCreatePost, useUpdatePost } from "@/hooks/usePosts";
import { estimateReadingTime } from "@/lib/markdown";
import { CATEGORY_VALUES } from "@/lib/category";
import { hasInAppHistory } from "@/lib/navigation";
import { postCreateSchema, postEditPath, postPath } from "@my-app/shared";
import type { PostData, PostFormField } from "@my-app/shared";
import {
  EMPTY_SNAPSHOT,
  clearDraft,
  draftKeyOf,
  persistDraft,
  readDraft,
  type FormSnapshot,
} from "@/lib/writeDraft";
import { MarkdownPane, type ViewMode } from "@/components/dashboard/write/MarkdownPane";
import { PostMetaFields } from "@/components/dashboard/write/PostMetaFields";
import { CoverField, isCoverUrlAllowed } from "@/components/dashboard/write/CoverField";
import { UnsavedChangesDialog } from "@/components/dashboard/write/UnsavedChangesDialog";
import { useUnsavedGuard } from "@/components/dashboard/write/useUnsavedGuard";

const DRAFT_DEBOUNCE_MS = 800;

export function WriteEditor({
  editId,
  initialPost,
}: {
  editId: string | null;
  initialPost: PostData | null;
}) {
  const router = useRouter();

  const isEditMode = !!editId;

  const draftKey = draftKeyOf(editId);

  const isPostError = isEditMode && !initialPost;

  const editingPost = initialPost?.post;

  const createPostMutation = useCreatePost();

  const updatePostMutation = useUpdatePost();

  const mutation = isEditMode ? updatePostMutation : createPostMutation;

  const t = useTranslations("write");
  const tCommon = useTranslations("common");

  const [title, setTitle] = useState("");

  const [category, setCategory] = useState<string>(CATEGORY_VALUES[0]);

  const [tags, setTags] = useState<string[]>([]);

  const [content, setContent] = useState("");

  const [coverImage, setCoverImage] = useState("");

  const [summary, setSummary] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors<PostFormField>>({});

  const hasNotifiedRestore = useRef(false);

  const [baseline, setBaseline] = useState<FormSnapshot>(EMPTY_SNAPSHOT);

  // ponytail: 是否与 baseline 有差异，决定「这是不是一份未保存的草稿」。
  // 必须在持久化 effect 之前求值（依赖数组在渲染期求值，放到后面会 TDZ）。
  const isDirty =
    title !== baseline.title ||
    category !== baseline.category ||
    content !== baseline.content ||
    coverImage !== baseline.coverImage ||
    summary !== baseline.summary ||
    tags.join("\u0000") !== baseline.tags.join("\u0000");

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "split";
    return window.innerWidth < 1024 ? "edit" : "split";
  });

  const hasPrefilled = useRef(false);

  const prefilledForId = useRef<string | null>(null);

  useEffect(() => {
    const saved = readDraft(draftKey);
    if (!saved) return;

    setTitle(saved.title ?? "");
    setCategory(saved.category ?? CATEGORY_VALUES[0]);
    setTags(saved.tags ?? []);
    setContent(saved.content ?? "");
    setCoverImage(saved.coverImage ?? "");
    setSummary(saved.summary ?? "");
    hasPrefilled.current = true;
    prefilledForId.current = editId;
    if (!hasNotifiedRestore.current) {
      hasNotifiedRestore.current = true;
      notify.info(msg("post", "draftRestored"));
    }
  }, [draftKey, editId]);

  useEffect(() => {
    // ponytail: 只有「与 baseline 不同」的内容才算未保存草稿。
    // 此前无条件持久化，导致服务端回填的正文被写成一份草稿副本 ——
    // 用户什么都没改，下次进入编辑器却收到「已恢复上次未保存的草稿」。
    if (!isDirty) return;

    const timer = setTimeout(() => {
      persistDraft(draftKey, { title, category, tags, content, coverImage, summary });
    }, DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [isDirty, draftKey, title, category, tags, content, coverImage, summary]);

  useEffect(() => {
    if (prefilledForId.current === null) return;
    if (prefilledForId.current === editId) return;
    prefilledForId.current = editId;
    hasPrefilled.current = false;
    setTitle("");
    setCategory(CATEGORY_VALUES[0]);
    setTags([]);
    setContent("");
    setCoverImage("");
    setSummary("");
    setFieldErrors({});
    setBaseline(EMPTY_SNAPSHOT);
  }, [editId]);

  useEffect(() => {
    if (isEditMode && editingPost && !hasPrefilled.current && editingPost.id === editId) {
      prefilledForId.current = editId;
      setTitle(editingPost.title);
      setCategory(editingPost.category);
      setTags(editingPost.tags || []);

      setContent(editingPost.contentRaw ?? editingPost.content);
      setCoverImage(editingPost.coverImage || "");
      setSummary(editingPost.summary || "");
      hasPrefilled.current = true;

      setBaseline({
        title: editingPost.title,
        category: editingPost.category,
        tags: editingPost.tags || [],
        content: editingPost.contentRaw ?? editingPost.content,
        coverImage: editingPost.coverImage || "",
        summary: editingPost.summary || "",
      });
    }
  }, [isEditMode, editingPost, editId]);

  const { confirmOpen, setConfirmOpen, guard } = useUnsavedGuard(isDirty);

  if (isPostError) {
    return (
      <Container className="page-section">
        <EmptyState
          icon={<Pencil size={20} strokeWidth={2.5} />}
          title={t("loadErrorTitle")}
          description={t("loadErrorDesc")}
          action={
            <Button href="/profile" variant="ghost">
              {t("backToMyPosts")}
            </Button>
          }
        />
      </Container>
    );
  }

  const saveErrorRules: ErrorFeedbackOptions<PostFormField> = {
    fields: ["title", "content", "category", "summary", "coverImage"],
    fallback: msg("update", "failed", { entity: entityName("post") }),
    byStatus: {
      401: { toast: msg("common", "notLoggedIn") },
    },
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    savePost(false);
  };

  const savePost = (asDraft: boolean) => {
    const invalid = validateForm(
      postCreateSchema,
      { title, content, category, summary, coverImage, isDraft: asDraft },
      {
        messages: {
          title: t("titleRequired"),
          content: t("contentRequired"),
          coverImage: t("coverInvalid"),
        },
        knownFields: ["title", "content", "category", "summary", "coverImage"],
      },
    );

    const errors: FieldErrors<PostFormField> = isCoverUrlAllowed(coverImage)
      ? invalid.fields
      : { ...invalid.fields, coverImage: t("coverInvalid") };

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstInvalid();
      return;
    }
    setFieldErrors({});

    const dto = {
      title: title.trim(),
      content,
      summary: summary.trim() || undefined,
      category,
      tags,
      isDraft: asDraft,
      coverImage: coverImage.trim() || undefined,
    };

    const onSuccess = (data: PostData) => {
      clearDraft(draftKey);
      // 已保存的内容就是新的基线：isDirty 归零，避免刚保存的内容被重新写成草稿。
      setBaseline({ title, category, tags, content, coverImage, summary });

      if (asDraft) {
        notify.success(msg("post", isEditMode ? "draftUpdated" : "draftSaved"));

        if (!isEditMode && data?.post?.id) {
          router.replace(postEditPath(data.post.id));
        }
      } else {
        if (isEditMode) notify.updated("post");
        else notify.success(msg("post", "published"));

        const target = data?.post?.id ? postPath(data.post.id) : "/posts";

        router.replace(target);
      }
    };

    const onError = (err: Error) => {
      const failed = resolveSubmitError(err, saveErrorRules);
      setFieldErrors(failed.fields);
      focusFirstInvalid();
    };

    if (isEditMode && editId) {
      updatePostMutation.mutate({ id: editId, dto }, { onSuccess, onError });
    } else {
      createPostMutation.mutate(dto, { onSuccess, onError });
    }
  };

  const navigateBack = () => {
    if (hasInAppHistory()) {
      router.back();
    } else {
      router.push("/profile");
    }
  };

  const handleBack = () => guard(navigateBack);

  const clearFieldError = (field: PostFormField) => {
    if (!fieldErrors[field]) return;
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <Container className="page-section">
      <PageHeader
        title={
          <h1 className="page-title max-md:page-title-mobile">
            {isEditMode ? t("editTitle") : t("createTitle")}
          </h1>
        }
        actions={
          <div className="segmented lg:hidden">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={`segmented-item ${viewMode !== "preview" ? "segmented-item-on" : ""}`}
              aria-label={t("viewEdit")}
            >
              <Pencil size={12} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`segmented-item ${viewMode === "preview" ? "segmented-item-on" : ""}`}
              aria-label={t("viewPreview")}
            >
              <Eye size={12} strokeWidth={2.5} />
            </button>
          </div>
        }
      />

      <form id="write-form" onSubmit={handleSave} noValidate>
        <div className="form-stack animate-fade-in">
          <div>
            <Input
              id="title"
              name="title"
              type="text"
              aria-label={t("titlePlaceholder")}
              placeholder={t("titlePlaceholder")}
              aria-describedby={fieldErrors.title ? "title-error" : undefined}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                clearFieldError("title");
              }}
              maxLength={200}
              error={!!fieldErrors.title}
              className="text-heading py-3 text-(length:--type-lg) leading-tight font-bold max-md:py-2 max-md:text-(length:--type-md)"
            />
            {fieldErrors.title && (
              <p
                id="title-error"
                className="text-state-error mt-2 text-(length:--type-xs) font-medium"
              >
                {fieldErrors.title}
              </p>
            )}
          </div>

          <div>
            <MarkdownPane
              content={content}
              onContentChange={(value) => {
                setContent(value);
                clearFieldError("content");
              }}
              error={fieldErrors.content}
              viewMode={viewMode}
            />
          </div>

          <PostMetaFields
            category={category}
            onCategoryChange={setCategory}
            tags={tags}
            onTagsChange={setTags}
            summary={summary}
            onSummaryChange={setSummary}
          />

          <CoverField
            value={coverImage}
            onChange={(value) => {
              setCoverImage(value);
              clearFieldError("coverImage");
            }}
            error={fieldErrors.coverImage}
          />

          <div className="row-md border-stroke mt-8 flex-wrap justify-between border-t pt-6">
            <span className="text-muted text-(length:--type-xs) leading-normal">
              {content.length > 0
                ? t("charCount", { count: content.length, minutes: estimateReadingTime(content) })
                : ""}
            </span>
            <div className="row-sm max-md:ml-auto">
              <Button variant="ghost" type="button" onClick={handleBack}>
                {tCommon("back")}
              </Button>

              {(!isEditMode || editingPost?.isDraft) && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={mutation.isPending}
                  onClick={() => savePost(true)}
                >
                  {mutation.isPending ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Check data-icon="inline-start" size={16} strokeWidth={2.5} />
                  )}
                  {isEditMode ? t("updateDraft") : t("saveDraft")}
                </Button>
              )}
              <Button type="submit" name="intent" value="publish" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : isEditMode && !editingPost?.isDraft ? (
                  <Check data-icon="inline-start" size={16} strokeWidth={2.5} />
                ) : (
                  <Send data-icon="inline-start" size={16} strokeWidth={2.5} />
                )}
                {isEditMode
                  ? editingPost?.isDraft
                    ? t("publishPost")
                    : t("updatePost")
                  : t("publishPost")}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <UnsavedChangesDialog
        open={confirmOpen}
        onOpenChange={(v) => !v && setConfirmOpen(false)}
        onDiscard={navigateBack}
      />
    </Container>
  );
}
