import { useCallback, useEffect, useRef, useState } from "react";

import type { Editor } from "@tiptap/react";
import type { ReactNode } from "react";

interface ColorPickerProps {
  editor: Editor;
  onSelect: (color: string) => void;
  onClear: () => void;
  currentColor?: string;
  icon: ReactNode;
  title: string;
}

const PRESET_COLORS = [
  { label: "Black", value: "#000000" },
  { label: "Dark gray", value: "#374151" },
  { label: "Blue", value: "#2563eb" },
  { label: "Red", value: "#dc2626" },
  { label: "Green", value: "#16a34a" },
  { label: "Orange", value: "#ea580c" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Teal", value: "#0d9488" },
  { label: "Brown", value: "#92400e" },
  { label: "Pink", value: "#db2777" },
] as const;

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function ColorPicker({ onSelect, onClear, currentColor, icon, title }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customHex, setCustomHex] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedCurrent = currentColor?.toLowerCase();

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCustomHex("");
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

  function handlePresetClick(color: string) {
    onSelect(color);
    handleClose();
  }

  function handleClear() {
    onClear();
    handleClose();
  }

  function handleCustomSubmit() {
    const hex = customHex.startsWith("#") ? customHex : `#${customHex}`;
    if (HEX_PATTERN.test(hex)) {
      onSelect(hex);
      handleClose();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={title}
        aria-label={title}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
          currentColor
            ? "bg-accent-100 text-accent-700"
            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        } focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-1`}
      >
        {icon}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg">
          <div className="grid grid-cols-5 gap-1.5">
            {PRESET_COLORS.map((color) => {
              const isActive = normalizedCurrent === color.value.toLowerCase();
              return (
                <button
                  key={color.value}
                  type="button"
                  title={color.label}
                  onClick={() => handlePresetClick(color.value)}
                  className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                    isActive
                      ? "ring-2 ring-accent-500 ring-offset-1"
                      : "border-zinc-200 hover:scale-110 hover:border-zinc-400"
                  }`}
                  style={{ backgroundColor: color.value }}
                >
                  {isActive && (
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke={isLightColor(color.value) ? "#000" : "#fff"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2.5 7.5L5.5 10.5L11.5 4.5" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          <div className="my-2 h-px bg-zinc-200" />

          <button
            type="button"
            onClick={handleClear}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded border border-zinc-300 bg-white">
              <svg
                className="h-3 w-3 text-zinc-400"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M2 2L10 10M10 2L2 10" />
              </svg>
            </span>
            Remove color
          </button>

          <div className="my-2 h-px bg-zinc-200" />

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">#</span>
            <input
              type="text"
              value={customHex}
              onChange={(e) =>
                setCustomHex(e.target.value.replace(/[^0-9a-fA-F#]/g, "").slice(0, 7))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCustomSubmit();
              }}
              placeholder="hex color"
              className="h-7 flex-1 rounded border border-zinc-200 px-2 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
            <button
              type="button"
              onClick={handleCustomSubmit}
              disabled={!HEX_PATTERN.test(customHex.startsWith("#") ? customHex : `#${customHex}`)}
              className="rounded bg-accent-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
