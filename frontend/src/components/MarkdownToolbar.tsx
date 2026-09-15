/**
 * @file MarkdownToolbar.tsx
 * @description Markdown 编辑器工具栏，提供加粗、斜体、标题、链接、代码、列表、引用等插入按钮；点击后通过 onInsert 回调在当前光标位置插入标记文本
 */
import { Bold, Italic, Heading, Link as LinkIcon, Code, Code2, List, Quote } from 'lucide-react';

/**
 * MarkdownToolbar 组件入参
 */
interface MarkdownToolbarProps {
  /** 在 textarea 当前光标位置插入文本的回调 */
  onInsert: (before: string, after?: string, placeholder?: string) => void;
}

/**
 * 工具栏按钮配置项
 */
interface ToolButton {
  /** 按钮展示图标 */
  icon: typeof Bold;
  /** 按钮标题与快捷键提示 */
  label: string;
  /** 光标处插入的前缀标记 */
  before: string;
  /** 光标后插入的后缀标记 */
  after?: string;
  /** 无选中文本时插入的占位内容 */
  placeholder?: string;
}

/** 工具栏按钮配置列表，按展示顺序排列 */
const TOOLS: ToolButton[] = [
  { icon: Bold, label: '加粗 (⌘B)', before: '**', after: '**', placeholder: '加粗文字' },
  { icon: Italic, label: '斜体 (⌘I)', before: '*', after: '*', placeholder: '斜体文字' },
  { icon: Heading, label: '标题', before: '### ', placeholder: '标题文字' },
  {
    icon: LinkIcon,
    label: '链接 (⌘K)',
    before: '[',
    after: '](https://)',
    placeholder: '链接文字',
  },
  { icon: Code, label: '行内代码', before: '`', after: '`', placeholder: 'code' },
  { icon: Code2, label: '代码块', before: '```js\n', after: '\n```', placeholder: '// code here' },
  { icon: List, label: '列表', before: '- ', placeholder: '列表项' },
  { icon: Quote, label: '引用', before: '> ', placeholder: '引用内容' },
];

/**
 * MarkdownToolbar 编辑器工具栏
 * @param props {@link MarkdownToolbarProps}
 */
export function MarkdownToolbar({ onInsert }: MarkdownToolbarProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {/* 工具栏按钮组，点击时插入对应 Markdown 标记 */}
      {TOOLS.map((tool) => (
        <button
          key={tool.label}
          type="button"
          title={tool.label}
          aria-label={tool.label}
          onClick={() => onInsert(tool.before, tool.after, tool.placeholder)}
          className="text-muted hover:bg-surface hover:text-heading flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150"
        >
          <tool.icon size={16} strokeWidth={2.5} />
        </button>
      ))}
    </div>
  );
}
