import { useCallback, useEffect, useRef, useState } from "react";

import type { Editor } from "@tiptap/react";

const PRESET_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72] as const;

const MIN_SIZE = 8;
const MAX_SIZE = 72;

interface FontSizePickerProps {
  editor: Editor;
}

function parseCurrentSize(editor: Editor): number | null {
  const fontSize = editor.getAttributes("textStyle").fontSize as string | undefined;
  if (!fontSize) return null;
  const parsed = parseInt(fontSize, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function FontSizePicker({ editor }: FontSizePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const currentSize = parseCurrentSize(editor);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCustomValue("");
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

  function applySize(size: number) {
    const chain = editor.chain().focus();
    chain.setFontSize(size + "pt").run();
    handleClose();
  }

  function handlePresetClick(size: number) {
    applySize(size);
  }

  function handleCustomSubmit() {
    const parsed = parseInt(customValue, 10);
    if (!Number.isNaN(parsed) && parsed >= MIN_SIZE && parsed <= MAX_SIZE) {
      applySize(parsed);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Font size"
        aria-label="Font size"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`min-w-[3rem] rounded px-2 py-1 text-center text-xs font-medium transition-colors ${
          currentSize
            ? "bg-accent-100 text-accent-700"
            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        } focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-1`}
      >
        {currentSize ? `${currentSize}pt` : "—"}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 w-28 rounded border border-zinc-200 bg-white shadow-lg">
          <div className="max-h-60 overflow-y-auto">
            {PRESET_SIZES.map((size) => {
              const isActive = currentSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => handlePresetClick(size)}
                  className={`flex w-full items-center px-3 py-1.5 text-left text-xs transition-colors ${
                    isActive
                      ? "bg-accent-100 font-semibold text-accent-700"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {size}pt
                </button>
              );
            })}
          </div>

          <div className="border-t border-zinc-200 p-2">
            <input
              type="text"
              inputMode="numeric"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value.replace(/\D/g, "").slice(0, 3))}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCustomSubmit();
              }}
              onBlur={handleCustomSubmit}
              placeholder="Custom"
              className="h-7 w-full rounded border border-zinc-200 px-2 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
