import { useCallback, useEffect, useRef, useState } from "react";

import type { Editor } from "@tiptap/react";

interface MathSymbolPaletteProps {
  editor: Editor;
}

interface SymbolCategory {
  label: string;
  symbols: { display: string; latex: string }[];
}

const CATEGORIES: SymbolCategory[] = [
  {
    label: "Greek",
    symbols: [
      { display: "\u03B1", latex: "\\alpha" },
      { display: "\u03B2", latex: "\\beta" },
      { display: "\u03B3", latex: "\\gamma" },
      { display: "\u03B4", latex: "\\delta" },
      { display: "\u03B5", latex: "\\epsilon" },
      { display: "\u03B6", latex: "\\zeta" },
      { display: "\u03B7", latex: "\\eta" },
      { display: "\u03B8", latex: "\\theta" },
      { display: "\u03BB", latex: "\\lambda" },
      { display: "\u03BC", latex: "\\mu" },
      { display: "\u03C0", latex: "\\pi" },
      { display: "\u03C3", latex: "\\sigma" },
      { display: "\u03C6", latex: "\\phi" },
      { display: "\u03C8", latex: "\\psi" },
      { display: "\u03C9", latex: "\\omega" },
      { display: "\u0393", latex: "\\Gamma" },
      { display: "\u0394", latex: "\\Delta" },
      { display: "\u03A3", latex: "\\Sigma" },
      { display: "\u03A6", latex: "\\Phi" },
      { display: "\u03A9", latex: "\\Omega" },
    ],
  },
  {
    label: "Operators",
    symbols: [
      { display: "\u00B1", latex: "\\pm" },
      { display: "\u00D7", latex: "\\times" },
      { display: "\u00F7", latex: "\\div" },
      { display: "\u2264", latex: "\\leq" },
      { display: "\u2265", latex: "\\geq" },
      { display: "\u2260", latex: "\\neq" },
      { display: "\u2248", latex: "\\approx" },
      { display: "\u221E", latex: "\\infty" },
      { display: "\u2208", latex: "\\in" },
      { display: "\u2282", latex: "\\subset" },
      { display: "\u222A", latex: "\\cup" },
      { display: "\u2229", latex: "\\cap" },
    ],
  },
  {
    label: "Fractions",
    symbols: [
      { display: "a/b", latex: "\\frac{}{}" },
      { display: "\u221A", latex: "\\sqrt{}" },
      { display: "\u207F\u221A", latex: "\\sqrt[n]{}" },
      { display: "x\u00B2", latex: "^{2}" },
      { display: "x\u2099", latex: "_{n}" },
    ],
  },
  {
    label: "Calculus",
    symbols: [
      { display: "\u222B", latex: "\\int" },
      { display: "\u2211", latex: "\\sum" },
      { display: "\u220F", latex: "\\prod" },
      { display: "lim", latex: "\\lim" },
      { display: "\u2202", latex: "\\partial" },
      { display: "\u2207", latex: "\\nabla" },
    ],
  },
  {
    label: "Arrows",
    symbols: [
      { display: "\u2190", latex: "\\leftarrow" },
      { display: "\u2192", latex: "\\rightarrow" },
      { display: "\u2194", latex: "\\leftrightarrow" },
      { display: "\u21D2", latex: "\\Rightarrow" },
      { display: "\u21D4", latex: "\\Leftrightarrow" },
      { display: "\u21A6", latex: "\\mapsto" },
    ],
  },
  {
    label: "Accents",
    symbols: [
      { display: "\u0302x", latex: "\\hat{}" },
      { display: "\u0304x", latex: "\\bar{}" },
      { display: "\u20D7x", latex: "\\vec{}" },
      { display: "\u0307x", latex: "\\dot{}" },
      { display: "\u0303x", latex: "\\tilde{}" },
    ],
  },
];

export function MathSymbolPalette({ editor }: MathSymbolPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
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

  function handleSymbolClick(latex: string) {
    const isInMath = editor.isActive("mathInline") || editor.isActive("mathBlock");

    if (isInMath) {
      // Insert LaTeX into current math node
      const currentLatex = (editor.getAttributes("mathInline").latex ||
        editor.getAttributes("mathBlock").latex ||
        "") as string;
      const newLatex = currentLatex + latex;
      editor
        .chain()
        .focus()
        .updateAttributes(editor.isActive("mathInline") ? "mathInline" : "mathBlock", {
          latex: newLatex,
        })
        .run();
    } else {
      // Create a new inline math node with this symbol
      editor
        .chain()
        .focus()
        .insertContent({
          type: "mathInline",
          attrs: { latex },
        })
        .run();
    }
  }

  const activeCategory = CATEGORIES[activeTab];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Math symbols"
        aria-label="Math symbols"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
          isOpen
            ? "bg-accent-100 text-accent-700"
            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        } focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-1`}
      >
        <span className="font-serif italic">fx</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-zinc-200 bg-white shadow-lg">
          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-zinc-200">
            {CATEGORIES.map((cat, i) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => setActiveTab(i)}
                className={`whitespace-nowrap px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                  activeTab === i
                    ? "border-b-2 border-accent-500 text-accent-700"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Symbol grid */}
          <div className="grid grid-cols-5 gap-1 p-2">
            {activeCategory.symbols.map((symbol) => (
              <button
                key={symbol.latex}
                type="button"
                title={symbol.latex}
                onClick={() => handleSymbolClick(symbol.latex)}
                className="flex h-8 w-full items-center justify-center rounded text-base transition-colors hover:bg-accent-50 hover:text-accent-700"
              >
                {symbol.display}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
