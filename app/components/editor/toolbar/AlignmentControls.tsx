import type { Editor } from "@tiptap/react";

interface AlignmentControlsProps {
  editor: Editor;
}

const alignments = [
  {
    value: "left" as const,
    label: "Align left",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="12" height="1.5" rx="0.5" fill="currentColor" />
        <rect x="2" y="7.25" width="8" height="1.5" rx="0.5" fill="currentColor" />
        <rect x="2" y="11.5" width="10" height="1.5" rx="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    value: "center" as const,
    label: "Align center",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="12" height="1.5" rx="0.5" fill="currentColor" />
        <rect x="4" y="7.25" width="8" height="1.5" rx="0.5" fill="currentColor" />
        <rect x="3" y="11.5" width="10" height="1.5" rx="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    value: "right" as const,
    label: "Align right",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="12" height="1.5" rx="0.5" fill="currentColor" />
        <rect x="6" y="7.25" width="8" height="1.5" rx="0.5" fill="currentColor" />
        <rect x="4" y="11.5" width="10" height="1.5" rx="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    value: "justify" as const,
    label: "Justify",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="12" height="1.5" rx="0.5" fill="currentColor" />
        <rect x="2" y="7.25" width="12" height="1.5" rx="0.5" fill="currentColor" />
        <rect x="2" y="11.5" width="12" height="1.5" rx="0.5" fill="currentColor" />
      </svg>
    ),
  },
] as const;

export function AlignmentControls({ editor }: AlignmentControlsProps) {
  return (
    <div className="flex items-center gap-0.5">
      {alignments.map(({ value, label, icon }) => {
        const isActive = editor.isActive({ textAlign: value });
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            title={label}
            onClick={() => editor.chain().focus().setTextAlign(value).run()}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "bg-accent-100 text-accent-700"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            } focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-1`}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
