import { Bold, Italic, Heading, Link as LinkIcon, Code, Code2, List, Quote } from "lucide-react";
import { useTranslations } from "next-intl";

interface MarkdownToolbarProps {
  onInsert: (before: string, after?: string, placeholder?: string) => void;
}

interface ToolButton {
  icon: typeof Bold;

  labelKey:
    | "toolbarBold"
    | "toolbarItalic"
    | "toolbarHeading"
    | "toolbarLink"
    | "toolbarInlineCode"
    | "toolbarCodeBlock"
    | "toolbarList"
    | "toolbarQuote";

  before: string;

  after?: string;

  placeholderKey?: "phBold" | "phItalic" | "phHeading" | "phLink" | "phList" | "phQuote";
}

const TOOLS: ToolButton[] = [
  { icon: Bold, labelKey: "toolbarBold", before: "**", after: "**", placeholderKey: "phBold" },
  { icon: Italic, labelKey: "toolbarItalic", before: "*", after: "*", placeholderKey: "phItalic" },
  { icon: Heading, labelKey: "toolbarHeading", before: "### ", placeholderKey: "phHeading" },
  {
    icon: LinkIcon,
    labelKey: "toolbarLink",
    before: "[",
    after: "](https://)",
    placeholderKey: "phLink",
  },
  { icon: Code, labelKey: "toolbarInlineCode", before: "`", after: "`" },
  { icon: Code2, labelKey: "toolbarCodeBlock", before: "```js\n", after: "\n```" },
  { icon: List, labelKey: "toolbarList", before: "- ", placeholderKey: "phList" },
  { icon: Quote, labelKey: "toolbarQuote", before: "> ", placeholderKey: "phQuote" },
];

export function MarkdownToolbar({ onInsert }: MarkdownToolbarProps) {
  const t = useTranslations("write");

  return (
    <div className="flex flex-wrap gap-1.5">
      {TOOLS.map((tool) => {
        const label = t(tool.labelKey);

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
