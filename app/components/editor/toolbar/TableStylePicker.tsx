import { useCallback, useEffect, useRef, useState } from "react";

import type { Editor } from "@tiptap/react";

import type { TableStyleValue } from "../extensions/table-style";

interface TableStylePickerProps {
  editor: Editor;
}

const TABLE_STYLES: readonly { value: TableStyleValue; label: string; description: string }[] = [
  { value: "default", label: "Default", description: "Standard table with borders" },
  { value: "academic", label: "Academic", description: "Booktabs-style minimal rules" },
  { value: "striped", label: "Striped", description: "Alternating row backgrounds" },
  { value: "bordered", label: "Bordered", description: "Full grid borders" },
  { value: "modern", label: "Modern", description: "Colored header with clean body" },
];

export function TableStylePicker({ editor }: TableStylePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentStyle =
    (editor.getAttributes("table").tableStyle as string | undefined) ?? "default";

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  function handleStyleSelect(style: TableStyleValue) {
    editor.chain().focus().setTableStyle(style).run();
    handleClose();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Table style"
        aria-label="Table style"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
          isOpen
            ? "bg-accent-100 text-accent-700"
            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        } focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-1`}
      >
        Style
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          {TABLE_STYLES.map((style) => {
            const isActive = currentStyle === style.value;
            return (
              <button
                key={style.value}
                type="button"
                onClick={() => handleStyleSelect(style.value)}
                className={`flex w-full flex-col px-3 py-2 text-left transition-colors ${
                  isActive ? "bg-accent-50 text-accent-700" : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <span className="text-xs font-medium">{style.label}</span>
                <span className="text-[10px] text-zinc-400">{style.description}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
