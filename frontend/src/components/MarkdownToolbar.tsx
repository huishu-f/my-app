/**
 * @file MarkdownToolbar.tsx
 * @description Markdown 编辑工具栏 — 工具文案由 i18n write 命名空间提供
 */
import { Bold, Italic, Heading, Link as LinkIcon, Code, Code2, List, Quote } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * MarkdownToolbar 组件入参
 */
interface MarkdownToolbarProps {
  /** 在 textarea 当前光标位置插入文本的回调 */
  onInsert: (before: string, after?: string, placeholder?: string) => void;
}

/**
 * 工具栏单个按钮配置
 */
interface ToolButton {
  /** 按钮展示图标 */
  icon: typeof Bold;
  /** 按钮标题与快捷键提示的翻译键 */
  labelKey: 'toolbarBold' | 'toolbarItalic' | 'toolbarHeading' | 'toolbarLink' | 'toolbarInlineCode' | 'toolbarCodeBlock' | 'toolbarList' | 'toolbarQuote';
  /** 光标处插入的前缀标记 */
  before: string;
  /** 光标后插入的后缀标记 */
  after?: string;
  /** 无选中文本时插入的占位内容翻译键 */
  placeholderKey?: 'phBold' | 'phItalic' | 'phHeading' | 'phLink' | 'phList' | 'phQuote';
}

/** 工具栏按钮配置列表：加粗、斜体、标题、链接、行内代码、代码块、列表、引用 */
const TOOLS: ToolButton[] = [
  { icon: Bold, labelKey: 'toolbarBold', before: '**', after: '**', placeholderKey: 'phBold' },
  { icon: Italic, labelKey: 'toolbarItalic', before: '*', after: '*', placeholderKey: 'phItalic' },
  { icon: Heading, labelKey: 'toolbarHeading', before: '### ', placeholderKey: 'phHeading' },
  {
    icon: LinkIcon,
    labelKey: 'toolbarLink',
    before: '[',
    after: '](https://)',
    placeholderKey: 'phLink',
  },
  { icon: Code, labelKey: 'toolbarInlineCode', before: '`', after: '`' },
  { icon: Code2, labelKey: 'toolbarCodeBlock', before: '```js\n', after: '\n```' },
  { icon: List, labelKey: 'toolbarList', before: '- ', placeholderKey: 'phList' },
  { icon: Quote, labelKey: 'toolbarQuote', before: '> ', placeholderKey: 'phQuote' },
];

/**
 * MarkdownToolbar Markdown 编辑工具栏
 * @param props {@link MarkdownToolbarProps}
 */
export function MarkdownToolbar({ onInsert }: MarkdownToolbarProps) {
  const t = useTranslations('write');

  return (
    <div className="flex flex-wrap gap-1.5">
      {/* 工具栏按钮组，点击时插入对应 Markdown 标记 */}
      {TOOLS.map((tool) => {
        const label = t(tool.labelKey);
        return (
          <button
            key={tool.labelKey}
            type="button"
            title={label}
            aria-label={label}
            onClick={() =>
              onInsert(tool.before, tool.after, tool.placeholderKey ? t(tool.placeholderKey) : undefined)
            }
            className="text-muted hover:bg-surface hover:text-heading flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150"
          >
            <tool.icon size={16} strokeWidth={2.5} />
          </button>
        );
      })}
    </div>
  );
}
