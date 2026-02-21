import { useCallback, useEffect, useRef, useState } from "react";

import type { Editor } from "@tiptap/react";

interface FontFamilyPickerProps {
  editor: Editor;
}

interface FontGroup {
  label: string;
  fonts: string[];
}

const FONT_GROUPS: FontGroup[] = [
  {
    label: "Serif",
    fonts: ["Times New Roman", "Georgia", "Cambria", "Merriweather", "Playfair Display", "Lora"],
  },
  {
    label: "Sans-serif",
    fonts: ["Arial", "Calibri", "Inter", "Open Sans", "Roboto"],
  },
  {
    label: "Monospace",
    fonts: ["JetBrains Mono", "Fira Code", "Courier New"],
  },
] as const;

const DEFAULT_FONT = "Georgia";

export function FontFamilyPicker({ editor }: FontFamilyPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentFont =
    (editor.getAttributes("textStyle").fontFamily as string | undefined) ?? DEFAULT_FONT;

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

  function handleFontSelect(fontName: string) {
    editor.chain().focus().setFontFamily(fontName).run();
    handleClose();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Font family"
        aria-label="Font family"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-1"
      >
        {currentFont}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-60 w-52 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          {FONT_GROUPS.map((group, groupIndex) => (
            <div key={group.label}>
              {groupIndex > 0 && <div className="my-1 h-px bg-zinc-200" />}
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                {group.label}
              </div>
              {group.fonts.map((fontName) => {
                const isActive = currentFont === fontName;
                return (
                  <button
                    key={fontName}
                    type="button"
                    onClick={() => handleFontSelect(fontName)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                      isActive ? "bg-accent-50 text-accent-700" : "text-zinc-700 hover:bg-zinc-100"
                    }`}
                    style={{ fontFamily: fontName }}
                  >
                    <span className="w-4 flex-shrink-0">
                      {isActive && (
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 14 14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2.5 7.5L5.5 10.5L11.5 4.5" />
                        </svg>
                      )}
                    </span>
                    {fontName}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
