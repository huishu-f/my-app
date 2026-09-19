/**
 * @file WriteEditor.tsx
 * @description 文章写作/编辑编辑器（/write）：Markdown 编辑 + 防抖实时预览（懒加载渲染管线）、工具栏与快捷键、标签管理、草稿/发布双通道保存；?id= 参数进入编辑模式回填
 */
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Eye, ChevronDown, X, Pencil, Check, Send } from 'lucide-react';
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
import { Modal } from '@/components/ui/Modal';
import { useCreatePost, useUpdatePost, usePostData } from '@/services/blog/hooks';
import { ApiRequestError } from '@/lib/api/request';
import { estimateReadingTime } from '@/lib/markdown';
import { sanitizeArticleContent } from '@/lib/sanitize';
import { MARKED_OPTIONS, highlightCode, registerHighlightLanguages } from '@/lib/markdown-highlight';
import { CATEGORY_LABEL_KEYS, CATEGORY_VALUES } from '@/lib/category';
import { hasInAppHistory } from '@/lib/navigation';
import { ALLOWED_IMAGE_HOSTS, isSafeImageUrl } from '@/lib/validators';
import type { PostData } from '@my-app/shared';

/** 渲染管线模块级单例缓存：marked/highlight.js 等重依赖只在首次使用时加载并构建一次 */
let markdownRendererPromise: Promise<(content: string) => Promise<string>> | null = null;

/**
 * 获取（并缓存）Markdown → HTML 的共享渲染函数
 * @returns Promise，resolve 出 (content: string) => Promise<string>：入参 markdown 原文，出参经 sanitize 的 HTML
 */
function getMarkdownRenderer(): Promise<(content: string) => Promise<string>> {
  if (markdownRendererPromise) return markdownRendererPromise;
  markdownRendererPromise = (async () => {
    // 动态 import：把 marked 与 highlight.js 语言包推迟到首次预览时加载，不进首屏 bundle
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

    // 只注册文章实际用到的语言模块，控制 highlight.js 体积
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
    // 按 HIGHLIGHT_ALIASES 把语言与其别名一并注册（如文章里写 ```ts 也能命中 typescript）；
    // 注册循环与文章页共用 registerHighlightLanguages，两侧只各自决定「注册哪些语言」
    registerHighlightLanguages(hljs, LANGUAGE_MODULES);

    const renderer = new marked.Renderer();
    // 自定义代码块渲染：高亮失败时降级输出原始代码，不让预览整块报错
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

    // 对外统一出口：marked 转 HTML 后再 sanitize，供预览区 dangerouslySetInnerHTML 安全注入
    return async (content: string) => {
      const raw = marked.parse(content, { async: false }) as string;
      return sanitizeArticleContent(raw);
    };
  })();
  return markdownRendererPromise;
}

/**
 * 表单快照的字段集合：脏检查只关心会入库的字段（tagInput 是过渡态，
 * 失焦即并入 tags，点击返回按钮前必先失焦，无需参与对比）
 */
type FormSnapshot = {
  title: string;
  category: string;
  tags: string[];
  content: string;
  coverImage: string;
  summary: string;
};

/** 空表单快照：新建模式与表单重置后的脏检查基线 */
const EMPTY_SNAPSHOT: FormSnapshot = {
  title: '',
  category: CATEGORY_VALUES[0],
  tags: [],
  content: '',
  coverImage: '',
  summary: '',
};

/**
 * 写作编辑器主体
 * URL 无 id 为新建，带 ?id= 进入编辑模式并回填该文章
 */
export function WriteEditor() {
  const router = useRouter();

  const searchParams = useSearchParams();

  /** 编辑目标文章 id（?id= 参数），新建模式为 null */
  const editId = searchParams.get('id');

  /** 是否编辑模式：决定拉取详情、回填与走 update 还是 create */
  const isEditMode = !!editId;

  /** 编辑模式下拉取文章详情；传空串 id 时 hook 内部（enabled=!!id）跳过请求，新建模式零开销 */
  const {
    data: postData,

    isLoading: isLoadingPost,

    isError: isPostError,
  } = usePostData(editId || '');

  /** 详情接口返回的文章，用于回填表单与判断是否为草稿 */
  const editingPost = postData?.post;

  /** 新建文章 mutation */
  const createPostMutation = useCreatePost();

  /** 更新文章 mutation */
  const updatePostMutation = useUpdatePost();

  /** 按模式选定的当前 mutation，供按钮 loading/disabled 统一取用 */
  const mutation = isEditMode ? updatePostMutation : createPostMutation;

  const t = useTranslations('write');
  const tCommon = useTranslations('common');
  /** 文章标题 */
  const [title, setTitle] = useState('');

  /** 分类，默认取候选列表第一项 */
  const [category, setCategory] = useState<string>(CATEGORY_VALUES[0]);

  /** 已添加的标签列表（上限 5 个，见 addTag） */
  const [tags, setTags] = useState<string[]>([]);

  /** 标签输入框中的原始文本，回车/逗号/失焦后转为正式标签 */
  const [tagInput, setTagInput] = useState('');

  /** 正文 Markdown 原文 */
  const [content, setContent] = useState('');

  /** 封面图 URL（需命中图片域名白名单） */
  const [coverImage, setCoverImage] = useState('');

  /** 文章摘要（可选；空串会转成 undefined，保存时从请求体省略） */
  const [summary, setSummary] = useState('');

  /** 保存校验失败的错误文案（标题/正文必填），展示在标题输入框下方 */
  const [formError, setFormError] = useState('');

  /** 是否展示「未保存更改」确认弹窗 */
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  /**
   * 脏检查基线：回填/重置那一刻的表单快照。返回时与当前表单逐字段对比，
   * 只有真正改过内容才弹确认框，没动过直接走（零打扰）
   */
  const [baseline, setBaseline] = useState<FormSnapshot>(EMPTY_SNAPSHOT);

  /**
   * 编辑区视图模式：split=桌面左编辑右预览双栏；edit/preview=窄屏单栏互斥切换。
   * 惰性初始化：SSR 无 window 时取 split，窄于 1024px（lg 断点，单位 px）默认纯编辑
   */
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>(() => {
    if (typeof window === 'undefined') return 'split';
    return window.innerWidth < 1024 ? 'edit' : 'split';
  });

  /** 回填只执行一次的标记：防止文章数据再次变化（如 refetch）覆盖用户正在编辑的内容 */
  const hasPrefilled = useRef(false);

  /** 回填时锁定的文章 id：?id= 切换时据此重置表单，防止 A 的内容被保存进 B */
  const prefilledForId = useRef<string | null>(null);

  /** 桌面版正文 textarea 的 Ref：工具栏/快捷键按光标位置插入 */
  const contentRef = useRef<HTMLTextAreaElement>(null);

  /** 移动版正文 textarea 的 Ref：桌面/移动各渲染一个实例，同一时刻仅其一可见 */
  const contentRefMobile = useRef<HTMLTextAreaElement>(null);

  /** 正文最新值的镜像：让 insertMarkdown 在不依赖 content 的情况下读到当前值 */
  const contentValueRef = useRef(content);

  /** 无依赖数组：每次渲染都把最新 content 写入 contentValueRef，供稳定回调读取 */
  useEffect(() => {
    contentValueRef.current = content;
  });

  /**
   * 监听 editId 变化：切换编辑目标（含 编辑→新建 / A→B）时整表重置。
   * 不重置的话旧文内容留在表单里，回填被 hasPrefilled 锁定不再执行，
   * 保存时 update({ id: B }) 会把 A 的内容写进 B——数据覆盖事故。
   */
  useEffect(() => {
    if (prefilledForId.current === null) return; // 首次挂载（含 null→id）交给回填逻辑，无需重置
    if (prefilledForId.current === editId) return; // 同一篇文章，无需动作
    prefilledForId.current = editId;
    hasPrefilled.current = false; // 解锁回填，等新文数据到达后重新填充
    setTitle('');
    setCategory(CATEGORY_VALUES[0]);
    setTags([]);
    setTagInput('');
    setContent(''); // 预览由 content 驱动：content 清空后防抖 effect 会自动清掉 previewHtml
    setCoverImage('');
    setSummary('');
    setFormError('');
    setBaseline(EMPTY_SNAPSHOT); // 脏检查基线同步归零，避免旧文的快照误判新表单为「未改动」
  }, [editId]);

  /** 监听 isEditMode/editingPost：编辑数据首次到达时回填表单，hasPrefilled 锁定后不再覆盖手改内容 */
  useEffect(() => {
    // editingPost.id 须与 editId 一致才回填：useFetch 的 data 在 key 切换后不会立即清空，
    // 切换瞬间 editingPost 仍是旧文对象，直接回填会把旧文内容填进新文的表单
    if (isEditMode && editingPost && !hasPrefilled.current && editingPost.id === editId) {
      prefilledForId.current = editId;
      setTitle(editingPost.title);
      setCategory(editingPost.category);
      setTags(editingPost.tags || []);
      // 正文优先取 markdown 原文字段
      setContent(editingPost.contentRaw ?? editingPost.content);
      setCoverImage(editingPost.coverImage || '');
      setSummary(editingPost.summary || '');
      hasPrefilled.current = true;
      // 脏检查基线锁定为回填内容：此后与当前表单对比，改过任何字段才算「有未保存更改」
      setBaseline({
        title: editingPost.title,
        category: editingPost.category,
        tags: editingPost.tags || [],
        content: editingPost.contentRaw ?? editingPost.content,
        coverImage: editingPost.coverImage || '',
        summary: editingPost.summary || '',
      });
    }
  }, [isEditMode, editingPost, editId]);

  /** 正文渲染出的预览 HTML（已 sanitize） */
  const [previewHtml, setPreviewHtml] = useState('');

  /** 预览渲染的防抖定时器句柄 */
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 监听 content/viewMode：输入停止 500ms（单位 ms）后才走渲染管线生成预览，
   * 避免每次按键都触发 marked+sanitize 的开销；正文为空或纯编辑模式（预览不可见）时跳过并清空旧值；
   * 渲染失败以纯文本兜底展示，卸载/内容切换时清掉未触发的定时器
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
        // 渲染管线异常降级：直接展示原文
        .catch(() => setPreviewHtml(content));
    }, 500);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [content, viewMode]);

  /**
   * 在光标处插入/包裹 Markdown 语法：有选区则包裹选区，无选区插入 placeholder。
   * 依赖数组为空保持回调稳定：经 contentValueRef 读最新正文，避免每次按键重生回调引发连锁渲染
   * @param before 前缀标记（如 **）
   * @param after 后缀标记，可选
   * @param placeholder 无选区时的占位文本
   */
  const insertMarkdown = useCallback((before: string, after?: string, placeholder?: string) => {
    // offsetParent 为 null 表示元素被 CSS 隐藏：桌面/移动两套 textarea 中取当前可见的那套
    const textarea =
      contentRef.current && contentRef.current.offsetParent !== null
        ? contentRef.current
        : contentRefMobile.current;
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
    // 等 React 把新 value 提交到 DOM 后再定位光标：落在插入文本/占位符末尾
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = start + before.length + insertText.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  }, []);

  /** 快捷键：Cmd/Ctrl + B 加粗、I 斜体、K 插入链接，效果等同工具栏按钮 */
  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!e.metaKey && !e.ctrlKey) return;
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
  };

  /** 编辑模式下文章详情加载中：先渲染骨架屏，避免闪现空白表单 */
  if (isEditMode && isLoadingPost) {
    return <LoadingSkeleton />;
  }

  /** 编辑模式详情加载失败：渲染错误占位并引导返回个人中心，避免停留在误导性的空编辑器 */
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
   * 提交当前输入为标签：trim 后要求非空、不与已有标签重复、总数 <5（单位: 个）；
   * 条件不满足时静默忽略（输入框内容保留）。注意局部 const t 遮蔽了外层翻译函数 t
   */
  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags((prev) => [...prev, t]);
      setTagInput('');
    }
  };

  /** 移除指定标签（形参 t 同样遮蔽外层翻译函数） */
  const removeTag = (t: string) => {
    setTags((prev) => prev.filter((x) => x !== t));
  };

  /** 回车或逗号即把输入提交为标签；preventDefault 阻止回车冒泡触发 form 隐式提交 */
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  /** 失焦时若仍有残留输入，顺手提交为标签，避免用户漏按回车丢词 */
  const handleTagBlur = () => {
    if (tagInput.trim()) addTag();
  };

  /** 表单 onSubmit（type=submit 发布按钮触发）：阻止原生提交，走 savePost(false) 发布 */
  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    savePost(false);
  };

  /**
   * 保存统一入口，草稿与发布共用
   * @param asDraft true=存草稿；false=发布（编辑模式即更新）
   * 标题/正文本地必填，校验失败写 formError 并 toast，不发请求
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

    // 组装请求体：摘要/封面为空串时转 undefined，从 payload 中省略该字段
    const dto = {
      title: title.trim(),
      content,
      summary: summary.trim() || undefined,
      category,
      tags,
      isDraft: asDraft,
      coverImage: coverImage.trim() || undefined,
    };

    /**
     * 保存成功回调。草稿：新建模式下把 URL 改写为 ?id=（replace 不留历史），
     * 让页面切入编辑模式，之后再存草稿走更新而非重复新建；发布：跳转文章详情页（无 id 时兜底列表页）
     */
    const onSuccess = (data: PostData) => {
      if (asDraft) {
        toast.success(isEditMode ? t('draftUpdated') : t('draftSaved'));

        if (!isEditMode && data?.post?.id) {
          router.replace(`/write?id=${encodeURIComponent(data.post.id)}`);
        }
      } else {
        toast.success(isEditMode ? t('postUpdated') : t('postPublished'));

        const target = data?.post?.id ? `/posts/${data.post.id}` : '/posts';
        // 无需 router.refresh()：保存走 Server Action，其内部的 revalidatePath 已把 Client Cache 里
        // 详情页/列表页的旧 RSC 快照一并清掉，这里 replace 过去拿到的就是新内容
        router.replace(target);
      }
    };

    /** 保存失败回调：401 视为会话失效提示重新登录；其余错误走统一 API 错误 toast */
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
   * 脏检查：当前表单与基线快照逐字段对比。
   * tags 用联结串对比规避数组引用不等；category/封面/摘要一并纳入——
   * 只改了封面没改正文也是未保存更改，漏判会让用户静默丢改动
   */
  const isDirty =
    title !== baseline.title ||
    category !== baseline.category ||
    content !== baseline.content ||
    coverImage !== baseline.coverImage ||
    summary !== baseline.summary ||
    tags.join('\u0000') !== baseline.tags.join('\u0000');

  /** 实际离开页面：有站内历史（hasInAppHistory）才 back；直接打开 /write 无历史，改跳个人中心避免 history.back 退出站点 */
  const navigateBack = () => {
    if (hasInAppHistory()) {
      router.back();
    } else {
      router.push('/profile');
    }
  };

  /**
   * 返回入口：有未保存更改先弹确认框（继续编辑 / 放弃更改），没改动直接走零打扰。
   * 注意按钮必须 type="button"——在 form 内默认 type=submit，会把返回变成一次误发布
   */
  const handleBack = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
      return;
    }
    navigateBack();
  };

  /** 正文为空时预览区展示的占位 HTML */
  const emptyPreviewHtml = `<span class="text-muted">${t('noContent')}</span>`;

  /** 封面地址 trim 后的值，用于预览图与校验 */
  const coverUrl = coverImage.trim();
  /** 空值合法（允许无封面）；非空必须命中 isSafeImageUrl 图片域名白名单，非法时输入框标红 */
  const coverAllowed = coverUrl === '' || isSafeImageUrl(coverUrl);

  return (
    <Container className="page-section">
      <PageHeader
        title={
          <h1 className="page-title max-md:page-title-mobile">
            {isEditMode ? t('editTitle') : t('createTitle')}
          </h1>
        }
        actions={
          /* 编辑⇄预览切换按钮组仅窄屏可见：lg 及以上左右双栏同屏展示，无需切换 */
          <div className="segmented lg:hidden">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`segmented-item ${viewMode !== 'preview' ? 'segmented-item-on' : ''}`}
              aria-label={t('viewEdit')}
            >
              <Pencil size={12} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`segmented-item ${viewMode === 'preview' ? 'segmented-item-on' : ''}`}
              aria-label={t('viewPreview')}
            >
              <Eye size={12} strokeWidth={2.5} />
            </button>
          </div>
        }
      />

      <form id="write-form" onSubmit={handleSave}>
        <div className="form-stack animate-fade-in">
          <div>
            <input
              id="title"
              name="title"
              type="text"
              aria-label={t('titlePlaceholder')}
              placeholder={t('titlePlaceholder')}
              aria-invalid={!!formError}
              aria-describedby={formError ? 'title-error' : undefined}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formError) setFormError('');
              }}
              maxLength={200}
              className={`input-field input-focus text-heading py-3 text-(length:--type-lg) leading-tight font-bold max-md:py-2 max-md:text-(length:--type-md) ${formError ? 'input-error' : ''}`}
            />
            {formError && (
              <p
                id="title-error"
                className="text-state-error mt-2 text-(length:--type-xs) font-medium"
              >
                {formError}
              </p>
            )}
          </div>

          <div>
            {/* lg 起左编辑右预览双栏；正文 textarea 由此存在桌面/移动两套实例，工具栏按可见性择一插入 */}
            <div className="hidden grid-cols-2 gap-4 lg:grid">
              <div className="border-stroke-strong bg-card-bg input-focus-within flex flex-col rounded-xl border">
                <div className="border-stroke border-b px-3 py-2">
                  <MarkdownToolbar onInsert={insertMarkdown} />
                </div>
                <textarea
                  ref={contentRef}
                  id="content"
                  name="content"
                  aria-label={t('contentPlaceholder')}
                  placeholder={t('contentPlaceholder')}
                  onKeyDown={handleContentKeyDown}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
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

            {/* 窄屏（<lg）单栏布局：编辑与预览互斥展示，由 viewMode 切换 */}
            <div className="lg:hidden">
              {viewMode === 'preview' ? (
                <div
                  className="article-content border-stroke-strong bg-card-bg min-h-[60vh] rounded-xl border p-6 text-(length:--type-base) leading-loose"
                  dangerouslySetInnerHTML={{ __html: previewHtml || emptyPreviewHtml }}
                />
              ) : (
                <>
                  <MarkdownToolbar onInsert={insertMarkdown} />
                  <textarea
                    ref={contentRefMobile}
                    id="content-mobile"
                    name="content"
                    aria-label={t('contentPlaceholder')}
                    placeholder={t('contentPlaceholder')}
                    onKeyDown={handleContentKeyDown}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={20}
                    className="textarea-field input-focus mt-2 min-h-100 font-mono text-(length:--type-sm) leading-loose"
                  />
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_1fr]">
            <FormField label={t('categoryLabel')}>
              <div className="relative">
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-field input-focus appearance-none pr-8"
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
                  className="text-faint pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                />
              </div>
            </FormField>

            <FormField label={t('tagLabel')} hint={t('tagHint')}>
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
                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-current/70 transition-colors duration-150 ease-out hover:text-current"
                      aria-label={`${t('removeTag')}：${item}`}
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
                    className="border-stroke-strong bg-card-bg text-body placeholder:text-muted input-focus h-9 w-32 rounded-md border px-3 text-(length:--type-2xs) leading-normal"
                  />
                )}
              </div>
            </FormField>
          </div>

          <div>
            <FormField
              label={t('coverLabel')}
              hint={t('coverHint')}
              error={
                coverAllowed
                  ? undefined
                  : t('coverInvalid', { hosts: ALLOWED_IMAGE_HOSTS.join(' / ') })
              }
            >
              <div className="row-sm">
                <input
                  id="cover-image"
                  name="coverImage"
                  type="url"
                  placeholder={`https://${ALLOWED_IMAGE_HOSTS[0]}/…`}
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  aria-invalid={!coverAllowed}
                  className={`input-field input-focus flex-1 ${coverAllowed ? '' : 'input-error'}`}
                />
                {coverUrl !== '' && coverAllowed && (
                  <div className="border-stroke-strong shrink-0 overflow-hidden rounded-md border">
                    <Image
                      src={coverUrl}
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
                className="textarea-field input-focus text-(length:--type-xs)"
              />
            </FormField>
          </div>

          <div className="row-md border-stroke mt-8 flex-wrap justify-between border-t pt-6">
            <span className="text-muted text-(length:--type-xs) leading-normal">
              {content.length > 0
                ? t('charCount', { count: content.length, minutes: estimateReadingTime(content) })
                : ''}
            </span>
            <div className="row-sm max-md:ml-auto">
              <Button variant="ghost" size="md" type="button" onClick={handleBack}>
                {tCommon('back')}
              </Button>
              {/* 存草稿仅对新建或草稿文章开放：编辑已发布文章时隐藏，避免保存把 isDraft 置回 true 使文章退回草稿态 */}
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
                {isEditMode && !editingPost?.isDraft ? (
                  <Check size={16} strokeWidth={2.5} />
                ) : (
                  <Send size={16} strokeWidth={2.5} />
                )}
                {isEditMode
                  ? editingPost?.isDraft
                    ? t('publishPost')
                    : t('updatePost')
                  : t('publishPost')}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* 未保存更改确认弹窗：仅在脏检查命中后由返回入口唤起；放弃更改=离开页面不落库，与删除确认弹窗同款布局 */}
      <Modal
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        title={t('leaveConfirmTitle')}
      >
        <p className="text-body text-(length:--type-sm) leading-normal">{t('leaveConfirmDesc')}</p>
        <div className="mt-8 flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={() => setShowLeaveConfirm(false)}>
            {t('keepEditing')}
          </Button>
          <Button variant="danger" type="button" onClick={navigateBack}>
            {t('discardChanges')}
          </Button>
        </div>
      </Modal>
    </Container>
  );
}
