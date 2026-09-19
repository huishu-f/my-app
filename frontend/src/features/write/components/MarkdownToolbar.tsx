/**
 * @file MarkdownToolbar.tsx
 * @description Markdown 编辑工具栏：渲染加粗/斜体/标题/链接/行内代码/代码块/列表/引用等按钮，点击后向编辑器插入对应语法包裹
 */
import { Bold, Italic, Heading, Link as LinkIcon, Code, Code2, List, Quote } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * MarkdownToolbar 组件入参
 */
interface MarkdownToolbarProps {
  /** 点击工具按钮时的插入回调：before 为前缀语法，after 为可选后缀语法，placeholder 为可选占位提示文案 */
  onInsert: (before: string, after?: string, placeholder?: string) => void;
}

/**
 * 单个工具按钮的配置描述
 */
interface ToolButton {
  /** lucide 图标组件 */
  icon: typeof Bold;

  /** 按钮无障碍/标题文案的 i18n key */
  labelKey:
    | 'toolbarBold'
    | 'toolbarItalic'
    | 'toolbarHeading'
    | 'toolbarLink'
    | 'toolbarInlineCode'
    | 'toolbarCodeBlock'
    | 'toolbarList'
    | 'toolbarQuote';

  /** 插入到光标前的语法前缀 */
  before: string;

  /** 插入到选区后的语法后缀，缺省表示仅前缀型（如标题、列表） */
  after?: string;

  /** 无选区时插入的占位提示文案 i18n key，缺省表示不需要占位 */
  placeholderKey?: 'phBold' | 'phItalic' | 'phHeading' | 'phLink' | 'phList' | 'phQuote';
}

/** 工具栏按钮配置表，按展示顺序排列 */
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
 * MarkdownToolbar 工具栏
 * @param props {@link MarkdownToolbarProps}
 */
export function MarkdownToolbar({ onInsert }: MarkdownToolbarProps) {
  const t = useTranslations('write');

  return (
    <div className="flex flex-wrap gap-1.5">
      {TOOLS.map((tool) => {
        const label = t(tool.labelKey);
        // 点击时把该按钮的语法前后缀与占位文案交给编辑器插入；无 placeholderKey 的工具不传占位
        return (
          <button
            key={tool.labelKey}
            type="button"
            title={label}
            aria-label={label}
            onClick={() =>
              onInsert(
                tool.before,
                tool.after,
                tool.placeholderKey ? t(tool.placeholderKey) : undefined,
              )
            }
            className="icon-btn-ghost"
          >
            <tool.icon size={16} strokeWidth={2.5} />
          </button>
        );
      })}
    </div>
  );
}
