import { useCallback, useEffect, useRef, useState } from "react";

import type { Editor } from "@tiptap/react";

interface SpacingControlsProps {
  editor: Editor;
}

const LINE_HEIGHT_PRESETS = [
  { label: "Single", value: 1.0 },
  { label: "1.15", value: 1.15 },
  { label: "1.5", value: 1.5 },
  { label: "Double", value: 2.0 },
] as const;

export function SpacingControls({ editor }: SpacingControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [paragraphBefore, setParagraphBefore] = useState(0);
  const [paragraphAfter, setParagraphAfter] = useState(0);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  function handleLineHeight(value: number) {
    const chain = editor.chain().focus();
    chain.setLineHeight(String(value)).run();
  }

  function handleParagraphBeforeChange(value: number) {
    setParagraphBefore(value);
    editor
      .chain()
      .focus()
      .setParagraphSpacing({ top: value + "px", bottom: paragraphAfter + "px" })
      .run();
  }

  function handleParagraphAfterChange(value: number) {
    setParagraphAfter(value);
    editor
      .chain()
      .focus()
      .setParagraphSpacing({ top: paragraphBefore + "px", bottom: value + "px" })
      .run();
  }

  function handleLetterSpacingChange(value: number) {
    setLetterSpacing(value);
    editor
      .chain()
      .focus()
      .setLetterSpacing(value + "px")
      .run();
  }

  function handleIncreaseIndent() {
    editor.chain().focus().increaseIndent().run();
  }

  function handleDecreaseIndent() {
    editor.chain().focus().decreaseIndent().run();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Spacing"
        aria-label="Spacing controls"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
          isOpen
            ? "bg-accent-100 text-accent-700"
            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        } focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-1`}
      >
        Spacing
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
          {/* Line Spacing */}
          <div>
            <span className="text-[10px] uppercase text-zinc-400">Line Spacing</span>
            <div className="mt-1 flex gap-1">
              {LINE_HEIGHT_PRESETS.map((preset) => {
                const isActive = editor.getAttributes("paragraph").lineHeight === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    title={preset.label}
                    onClick={() => handleLineHeight(preset.value)}
                    className={`flex-1 rounded px-1.5 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-accent-100 text-accent-700"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    }`}
                  >
                    {preset.value}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="my-2 h-px bg-zinc-200" />

          {/* Paragraph Spacing */}
          <div>
            <span className="text-[10px] uppercase text-zinc-400">Paragraph Spacing</span>
            <div className="mt-1 flex items-center gap-3">
              <label className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500">Before</span>
                <input
                  type="number"
                  min={0}
                  value={paragraphBefore}
                  onChange={(e) => handleParagraphBeforeChange(Math.max(0, Number(e.target.value)))}
                  className="w-16 rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-800 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500">After</span>
                <input
                  type="number"
                  min={0}
                  value={paragraphAfter}
                  onChange={(e) => handleParagraphAfterChange(Math.max(0, Number(e.target.value)))}
                  className="w-16 rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-800 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
              </label>
            </div>
          </div>

          <div className="my-2 h-px bg-zinc-200" />

          {/* Indentation */}
          <div>
            <span className="text-[10px] uppercase text-zinc-400">Indentation</span>
            <div className="mt-1 flex gap-1">
              <button
                type="button"
                title="Decrease indent"
                onClick={handleDecreaseIndent}
                className="flex-1 rounded px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                <span className="flex items-center justify-center gap-1">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 4h12M6 8h8M2 12h12M4.5 6.5L2 8.5l2.5 2" />
                  </svg>
                  Decrease
                </span>
              </button>
              <button
                type="button"
                title="Increase indent"
                onClick={handleIncreaseIndent}
                className="flex-1 rounded px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                <span className="flex items-center justify-center gap-1">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 4h12M6 8h8M2 12h12M2 6.5l2.5 2L2 10.5" />
                  </svg>
                  Increase
                </span>
              </button>
            </div>
          </div>

          <div className="my-2 h-px bg-zinc-200" />

          {/* Letter Spacing */}
          <div>
            <span className="text-[10px] uppercase text-zinc-400">Letter Spacing</span>
            <div className="mt-1">
              <label className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={letterSpacing}
                  onChange={(e) => handleLetterSpacingChange(Number(e.target.value))}
                  className="w-16 rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-800 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
                <span className="text-xs text-zinc-500">px</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
