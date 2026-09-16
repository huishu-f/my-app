/**
 * @file WriteEditor.tsx
 * @description 写文章/编辑文章客户端编辑器：标题/分类/标签/正文/封面/摘要表单，
 *              桌面分栏实时 Markdown 预览（懒加载 marked + highlight.js）、快捷键插入标记、
 *              发布/存草稿双提交路径，编辑模式按 URL id 拉取文章预填。
 */
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Eye, ChevronDown, X, Columns2, Pencil, Check, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import toast from '@/lib/toast';
import { handleApiError } from '@/lib/error-toast';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tag, tagVariantFor } from '@/components/ui/Tag';
import { MarkdownToolbar } from '@/components/MarkdownToolbar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { useCreatePost, useUpdatePost, usePostData } from '@/services/blog/hooks';
import { ApiRequestError } from '@/lib/api/request';
import { estimateReadingTime } from '@/lib/markdown';
import { sanitizeArticleContent } from '@/lib/sanitize';
import { HIGHLIGHT_ALIASES, MARKED_OPTIONS, highlightCode } from '@/lib/markdown-highlight';
import { CATEGORY_LABEL_KEYS, CATEGORY_VALUES } from '@/lib/category';
import { hasInAppHistory } from '@/lib/navigation';
import type { PostData } from '@my-app/shared';

/**
 * 动态加载 marked + highlight.js，避免 ~100KB 阻塞初始加载
 */
let markdownRendererPromise: Promise<(content: string) => Promise<string>> | null = null;

/**
 * 懒加载并返回 Markdown 渲染函数
 * @returns 将 Markdown 渲染为净化后 HTML 的异步函数
 */
function getMarkdownRenderer(): Promise<(content: string) => Promise<string>> {
  if (markdownRendererPromise) return markdownRendererPromise;
  markdownRendererPromise = (async () => {
    const [
      { marked },
      { default: hljs },
      { default: javascript },
      { default: typescript },
      { default: xml },
      { default: css },
      { default: json },
      { default: bash },
      { default: python },
      { default: sql },
    ] = await Promise.all([
      import('marked'),
      import('highlight.js/lib/core'),
      import('highlight.js/lib/languages/javascript'),
      import('highlight.js/lib/languages/typescript'),
      import('highlight.js/lib/languages/xml'),
      import('highlight.js/lib/languages/css'),
      import('highlight.js/lib/languages/json'),
      import('highlight.js/lib/languages/bash'),
      import('highlight.js/lib/languages/python'),
      import('highlight.js/lib/languages/sql'),
    ]);

    // 与 server 端共用同一别名表（lib/markdown-highlight.ts），此处仅注册预览子集语言
    const LANGUAGE_MODULES: Record<string, Parameters<typeof hljs.registerLanguage>[1]> = {
      javascript,
      typescript,
      xml,
      css,
      json,
      bash,
      python,
      sql,
    };
    for (const [lang, aliases] of Object.entries(HIGHLIGHT_ALIASES)) {
      const mod = LANGUAGE_MODULES[lang];
      if (mod) {
        hljs.registerLanguage(lang, mod);
        for (const alias of aliases) hljs.registerLanguage(alias, mod);
      }
    }

    const renderer = new marked.Renderer();
    renderer.code = ({ text, lang }) => {
      const code = text.replace(/\n$/, '');
      try {
        const highlighted = highlightCode(hljs, code, lang);
        return `<pre><code class="hljs language-${lang || 'plaintext'}">${highlighted}</code></pre>`;
      } catch {
        return `<pre><code class="hljs">${code}</code></pre>`;
      }
    };

    marked.setOptions(MARKED_OPTIONS);

    return async (content: string) => {
      const raw = marked.parse(content, { async: false }) as string;
      return sanitizeArticleContent(raw);
    };
  })();
  return markdownRendererPromise;
}

/**
 * WriteEditor 写文章编辑器组件
 */
export function WriteEditor() {
  /** 国际化路由实例 */
  const router = useRouter();
  /** URL 搜索参数（读取 id 判定编辑模式） */
  const searchParams = useSearchParams();
  /** 编辑目标文章 id（URL 参数） */
  const editId = searchParams.get('id');
  /** 是否编辑模式（存在 id 即编辑） */
  const isEditMode = !!editId;
  /** 编辑目标的文章数据查询（新建模式传空串不启用） */
  const {
    data: postData,
    /** 文章加载中标记 */
    isLoading: isLoadingPost,
    /** 文章加载失败标记 */
    isError: isPostError,
  } = usePostData(editId || '');
  /** 正在编辑的文章实体 */
  const editingPost = postData?.post;

  /** 创建文章 mutation */
  const createPostMutation = useCreatePost();
  /** 更新文章 mutation */
  const updatePostMutation = useUpdatePost();
  /** 当前模式对应的提交 mutation（按钮 loading 态共用） */
  const mutation = isEditMode ? updatePostMutation : createPostMutation;

  /** 写作页与通用文案翻译函数 */
  const t = useTranslations('write');
  const tCommon = useTranslations('common');
  const [title, setTitle] = useState('');
  /** 文章分类 */
  const [category, setCategory] = useState<string>(CATEGORY_VALUES[0]);
  /** 已添加的标签列表 */
  const [tags, setTags] = useState<string[]>([]);
  /** 标签输入框当前值 */
  const [tagInput, setTagInput] = useState('');
  /** 正文 Markdown 内容 */
  const [content, setContent] = useState('');
  /** 封面图 URL 输入值 */
  const [coverImage, setCoverImage] = useState('');
  /** 摘要输入值 */
  const [summary, setSummary] = useState('');
  /** 表单内联错误提示（空标题/空内容时显示） */
  const [formError, setFormError] = useState('');
  /** 编辑视图模式：分栏/仅编辑/仅预览 */
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>(() => {
    if (typeof window === 'undefined') return 'split';
    return window.innerWidth < 1024 ? 'edit' : 'split';
  });

  /**
   * 是否已完成编辑模式表单预填
   */
  const hasPrefilled = useRef(false);
  /**
   * 正文 textarea 的 DOM 引用
   */
  const contentRef = useRef<HTMLTextAreaElement>(null);
  /**
   * content 状态的 ref 镜像，供 insertMarkdown 在不依赖 content 的前提下读取最新值
   */
  const contentValueRef = useRef(content);
  /**
   * 同步 content 最新值到 ref 镜像
   */
  useEffect(() => {
    contentValueRef.current = content;
  });

  /**
   * 编辑模式：文章数据加载完成后预填表单
   */
  useEffect(() => {
    if (isEditMode && editingPost && !hasPrefilled.current) {
      setTitle(editingPost.title);
      setCategory(editingPost.category);
      setTags(editingPost.tags || []);
      setContent(editingPost.contentRaw ?? editingPost.content);
      setCoverImage(editingPost.coverImage || '');
      setSummary(editingPost.summary || '');
      hasPrefilled.current = true;
    }
  }, [isEditMode, editingPost]);

  /** 预览渲染生成的 HTML 字符串 */
  const [previewHtml, setPreviewHtml] = useState('');
  /**
   * 预览渲染防抖定时器
   */
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * 预览渲染：防抖 500ms，仅在分栏/预览模式下才执行，减少卡顿
   */
  useEffect(() => {
    if (!content || viewMode === 'edit') {
      setPreviewHtml('');
      return;
    }
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      getMarkdownRenderer()
        .then((render) => render(content))
        .then((html) => setPreviewHtml(html))
        .catch(() => setPreviewHtml(content));
    }, 500);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [content, viewMode]);

  /**
   * 在光标位置插入 Markdown 标记
   * @param before 前置标记文本
   * @param after 后置闭合标记文本
   * @param placeholder 无选中文本时的占位内容
   */
  const insertMarkdown = useCallback(
    (before: string, after?: string, placeholder?: string) => {
      const textarea = contentRef.current;
      if (!textarea) return;
      const currentContent = contentValueRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = currentContent.substring(start, end);
      const insertText = selectedText || placeholder || '';
      const newText =
        currentContent.substring(0, start) +
        before +
        insertText +
        (after || '') +
        currentContent.substring(end);
      setContent(newText);
      requestAnimationFrame(() => {
        textarea.focus();
        const cursorPos = start + before.length + insertText.length;
        textarea.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [], // ← 空依赖：通过 contentValueRef 读取最新 content，避免每次按键重建
  );

  // 编辑模式加载中：整页骨架
  if (isEditMode && isLoadingPost) {
    return <LoadingSkeleton />;
  }

  // 编辑模式加载失败：错误态 + 返回个人中心
  if (isEditMode && isPostError) {
    return (
      <Container className="page-section">
        <EmptyState
          icon={<Pencil size={20} strokeWidth={2.5} />}
          title={t('loadErrorTitle')}
          description={t('loadErrorDesc')}
          action={
            <Button href="/profile" variant="ghost">
              {t('backToMyPosts')}
            </Button>
          }
        />
      </Container>
    );
  }

  /**
   * 将输入框内容添加为标签
   */
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags((prev) => [...prev, t]);
      setTagInput('');
    }
  };

  /**
   * 移除指定标签
   * @param t 待移除的标签文本
   */
  const removeTag = (t: string) => {
    setTags((prev) => prev.filter((x) => x !== t));
  };

  /**
   * 标签输入框回车/逗号键处理，触发添加标签
   * @param e 键盘事件
   */
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  /**
   * 标签输入框失焦时自动添加未提交的标签
   */
  const handleTagBlur = () => {
    if (tagInput.trim()) addTag();
  };

  /**
   * 表单提交处理：阻止默认行为后以「发布」路径保存文章
   * @param e 表单提交事件
   */
  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    savePost(false);
  };

  /**
   * 保存文章（发布或存草稿）
   * 发布走 isDraft=false，草稿走 isDraft=true（不进公开列表）；
   * 新建草稿成功后 URL 切换为该草稿的编辑态，发布成功后 replace 到文章详情
   * @param asDraft 是否保存为草稿
   */
  const savePost = (asDraft: boolean) => {
    if (!title.trim()) {
      const msg = t('titleRequired');
      setFormError(msg);
      toast.error(msg);
      return;
    }
    if (!content.trim()) {
      const msg = t('contentRequired');
      setFormError(msg);
      toast.error(msg);
      return;
    }
    setFormError('');

    /** 提交给接口的文章数据 */
    const dto = {
      title: title.trim(),
      content,
      summary: summary.trim() || undefined,
      category,
      tags,
      isDraft: asDraft,
      coverImage: coverImage.trim() || undefined,
    };

    /** 保存成功回调：按模式 toast 提示并导航 */
    const onSuccess = (data: PostData) => {
      if (asDraft) {
        toast.success(isEditMode ? t('draftUpdated') : t('draftSaved'));
        // 新建草稿：URL 切换为编辑态，后续继续编辑/发布均基于该草稿 id
        if (!isEditMode && data?.post?.id) {
          router.replace(`/write?id=${encodeURIComponent(data.post.id)}`);
        }
      } else {
        toast.success(isEditMode ? t('postUpdated') : t('postPublished'));
        // replace 而非 push：发布已完成，返回键不该回到写作编辑器
        router.replace(data?.post?.id ? `/posts/${data.post.id}` : '/posts');
      }
    };

    /** 保存失败回调：未登录提示重新登录，其余统一错误 toast */
    const onError = (err: Error) => {
      if (err instanceof ApiRequestError && err.isUnauthorized) {
        toast.error(t('loginRequired'));
      } else {
        handleApiError(err, tCommon('saveFailed'));
      }
    };

    if (isEditMode && editId) {
      updatePostMutation.mutate({ id: editId, dto }, { onSuccess, onError });
    } else {
      createPostMutation.mutate(dto, { onSuccess, onError });
    }
  };

  /**
   * 返回：有站内软导航历史则 back()（如从文章详情「编辑」进入时返回详情），
   * 否则兜底跳个人中心。判据见 hasInAppHistory（防手机 webview 下 back 退出站点）
   */
  const handleBack = () => {
    if (hasInAppHistory()) {
      router.back();
    } else {
      router.push('/profile');
    }
  };

  return (
    <Container className="page-section max-w-350">
      <PageHeader
        title={
          <h1 className="page-title max-md:page-title-mobile">
            {isEditMode ? t('editTitle') : t('createTitle')}
          </h1>
        }
        actions={
          <div className="row-sm">
            <div className="segmented">
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`segmented-item lg:hidden ${viewMode === 'edit' ? 'segmented-item-on' : ''}`}
                aria-label={t('viewEdit')}
              >
                <Pencil size={12} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`segmented-item ${viewMode === 'split' ? 'segmented-item-on' : ''}`}
                aria-label={t('viewSplit')}
              >
                <Columns2 size={12} strokeWidth={2.5} />
                <span className="hidden sm:inline">{t('viewSplit')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`segmented-item lg:hidden ${viewMode === 'preview' ? 'segmented-item-on' : ''}`}
                aria-label={t('viewPreview')}
              >
                <Eye size={12} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        }
      />

      <form id="write-form" onSubmit={handleSave}>
        <div className="form-stack animate-fade-in">
          {/* 标题输入区 */}
          <div>
            <input
              id="title"
              name="title"
              type="text"
              aria-label={t('titlePlaceholder')}
              placeholder={t('titlePlaceholder')}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formError) setFormError('');
              }}
              maxLength={200}
              className={`input-field input-focus text-heading py-3 text-(length:--type-3xl) leading-tight font-bold max-md:py-2 max-md:text-(length:--type-xl) ${formError ? 'input-error' : ''}`}
            />
            {formError && (
              <p className="text-state-error mt-2 text-(length:--type-sm) font-medium">
                {formError}
              </p>
            )}
          </div>

          {/* 正文 — 分栏编辑器 */}
          <div>
            {/* 桌面端分栏 */}
            <div className="hidden grid-cols-2 gap-4 lg:grid">
              <div className="border-stroke-strong bg-page input-focus-within flex flex-col rounded-lg border">
                <div className="border-stroke border-b px-3 py-2">
                  <MarkdownToolbar onInsert={insertMarkdown} />
                </div>
                <textarea
                  ref={contentRef}
                  id="content"
                  name="content"
                  aria-label={t('contentPlaceholder')}
                  placeholder={t('contentPlaceholder')}
                  onKeyDown={(e) => {
                    if (e.metaKey || e.ctrlKey) {
                      if (e.key === 'b') {
                        e.preventDefault();
                        insertMarkdown('**', '**', t('phBold'));
                      } else if (e.key === 'i') {
                        e.preventDefault();
                        insertMarkdown('*', '*', t('phItalic'));
                      } else if (e.key === 'k') {
                        e.preventDefault();
                        insertMarkdown('[', '](https://)', t('phLink'));
                      }
                    }
                  }}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="text-body placeholder:text-faint min-h-[60vh] w-full flex-1 resize-none rounded-b-lg border-0 bg-transparent px-4 py-3 font-mono text-(length:--type-sm) leading-loose focus:outline-none"
                />
              </div>
              <div className="border-stroke-strong bg-page min-h-[60vh] overflow-y-auto rounded-lg border p-6">
                <div
                  className="article-content text-(length:--type-md) leading-loose"
                  dangerouslySetInnerHTML={{
                    __html: previewHtml || `<span class='text-faint'>${t('noContent')}</span>`,
                  }}
                />
              </div>
            </div>

            {/* 移动端单列 */}
            <div className="lg:hidden">
              {viewMode === 'preview' ? (
                <div
                  className="article-content border-stroke-strong bg-page min-h-[60vh] rounded-lg border p-6 text-(length:--type-md) leading-loose"
                  dangerouslySetInnerHTML={{
                    __html: previewHtml || `<span class='text-faint'>${t('noContent')}</span>`,
                  }}
                />
              ) : (
                <>
                  <MarkdownToolbar onInsert={insertMarkdown} />
                  <textarea
                    ref={contentRef}
                    id="content-mobile"
                    name="content"
                    aria-label={t('contentPlaceholder')}
                    placeholder={t('contentPlaceholder')}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={20}
                    className={`textarea-field input-focus min-h-100 font-mono text-(length:--type-sm) leading-loose`}
                  />
                </>
              )}
            </div>
          </div>

          {/* 分类与标签 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
            <FormField label={t('categoryLabel')}>
              <div className="relative">
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`input-field input-focus appearance-none pr-8`}
                >
                  {CATEGORY_VALUES.map((c) => (
                    <option key={c} value={c}>
                      {tCommon(CATEGORY_LABEL_KEYS[c])}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  strokeWidth={2.5}
                  className={`text-faint pointer-events-none absolute top-1/2 right-3 -translate-y-1/2`}
                />
              </div>
            </FormField>

            <FormField label={t('tagLabel')} hint={t('tagHint')}>
              <div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((item) => (
                    <Tag
                      key={item}
                      variant={tagVariantFor(item)}
                      size="md"
                      className="inline-flex items-center gap-1"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => removeTag(item)}
                        className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-current/70 transition-colors duration-150 ease-out hover:text-current`}
                        aria-label={t('removeTag')}
                      >
                        <X size={12} strokeWidth={2.5} />
                      </button>
                    </Tag>
                  ))}
                  {tags.length < 5 && (
                    <input
                      id="tag-input"
                      name="tags"
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      onBlur={handleTagBlur}
                      placeholder={t('tagPlaceholder')}
                      className={`border-stroke bg-page text-body placeholder:text-faint input-focus h-9 w-32 rounded-md border px-3 text-(length:--type-xs) leading-normal`}
                    />
                  )}
                </div>
              </div>
            </FormField>
          </div>

          {/* 封面图 */}
          <div>
            <FormField label={t('coverLabel')} hint={t('coverHint')}>
              <div className="row-sm">
                <input
                  id="cover-image"
                  name="coverImage"
                  type="url"
                  placeholder="https://example.com/cover.jpg"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="input-field input-focus flex-1"
                />
                {coverImage.trim() && (
                  <div className="border-stroke-strong shrink-0 overflow-hidden rounded-lg border">
                    <Image
                      src={coverImage.trim()}
                      alt={t('coverPreview')}
                      width={40}
                      height={40}
                      unoptimized
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 object-cover"
                    />
                  </div>
                )}
              </div>
            </FormField>
          </div>

          {/* 摘要 */}
          <div>
            <FormField label={t('summaryLabel')} hint={t('summaryHint')}>
              <textarea
                id="summary"
                name="summary"
                placeholder={t('summaryPlaceholder')}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                maxLength={500}
                rows={2}
                className="textarea-field input-focus text-(length:--type-sm)"
              />
            </FormField>
          </div>

          {/* 底部操作区 — flex-wrap：移动端字数统计与按钮组自动分行，按钮组换行后靠右 */}
          <div className={`row-md border-stroke mt-8 flex-wrap justify-between border-t pt-6`}>
            <span className={`text-muted text-(length:--type-sm) leading-normal`}>
              {content.length > 0
                ? t('charCount', { count: content.length, minutes: estimateReadingTime(content) })
                : ''}
            </span>
            <div className="row-sm max-md:ml-auto">
              <Button variant="ghost" size="md" onClick={handleBack}>
                {tCommon('back')}
              </Button>
              {/* 存草稿（BUG-03 修复）：新建与草稿编辑可用；已发布文章不提供转草稿，避免误操作下架 */}
              {(!isEditMode || editingPost?.isDraft) && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  loading={mutation.isPending}
                  disabled={mutation.isPending}
                  onClick={() => savePost(true)}
                >
                  <Check size={16} strokeWidth={2.5} />
                  {isEditMode ? t('updateDraft') : t('saveDraft')}
                </Button>
              )}
              <Button
                type="submit"
                name="intent"
                value="publish"
                size="md"
                loading={mutation.isPending}
                disabled={mutation.isPending}
              >
                {/* 图标随语义切换：发布=Send，更新已发布文章=Check（与文案条件一致） */}
                {isEditMode && !editingPost?.isDraft ? (
                  <Check size={16} strokeWidth={2.5} />
                ) : (
                  <Send size={16} strokeWidth={2.5} />
                )}
                {isEditMode ? (editingPost?.isDraft ? t('publishPost') : t('updatePost')) : t('publishPost')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Container>
  );
}
