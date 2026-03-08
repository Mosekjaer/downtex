import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type RefObject } from "react";

type Alignment = "left" | "center" | "right";

interface FigureToolbarProps {
  referenceRef: RefObject<HTMLElement | null>;
  alignment: Alignment;
  hasCrop: boolean;
  onAlign: (alignment: Alignment) => void;
  onCropToggle: () => void;
  onDelete: () => void;
}

const alignIcons: Record<Alignment, React.ReactNode> = {
  left: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="1.5" rx="0.5" fill="currentColor" />
      <rect x="2" y="7.25" width="8" height="1.5" rx="0.5" fill="currentColor" />
      <rect x="2" y="11.5" width="10" height="1.5" rx="0.5" fill="currentColor" />
    </svg>
  ),
  center: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="1.5" rx="0.5" fill="currentColor" />
      <rect x="4" y="7.25" width="8" height="1.5" rx="0.5" fill="currentColor" />
      <rect x="3" y="11.5" width="10" height="1.5" rx="0.5" fill="currentColor" />
    </svg>
  ),
  right: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="1.5" rx="0.5" fill="currentColor" />
      <rect x="6" y="7.25" width="8" height="1.5" rx="0.5" fill="currentColor" />
      <rect x="4" y="11.5" width="10" height="1.5" rx="0.5" fill="currentColor" />
    </svg>
  ),
};

const cropIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M4 1v3H1v1.5h3V12h6.5v3H12v-3h3v-1.5h-3V4H5.5V1H4zm1.5 4.5H11V11H5.5V5.5z"
      fill="currentColor"
    />
  </svg>
);

const deleteIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M5.5 2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1H13v1.5H3V3h2.5V2zm-2 4h9l-.5 8H4l-.5-8z"
      fill="currentColor"
    />
  </svg>
);

const btnBase =
  "flex items-center justify-center rounded p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-1";
const btnActive = "bg-accent-100 text-accent-700";

export function FigureToolbar({
  referenceRef,
  alignment,
  hasCrop,
  onAlign,
  onCropToggle,
  onDelete,
}: FigureToolbarProps) {
  const floatingRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function updatePosition() {
      const refEl = referenceRef.current;
      const floatEl = floatingRef.current;
      if (!refEl || !floatEl) return;

      const refRect = refEl.getBoundingClientRect();
      const floatRect = floatEl.getBoundingClientRect();

      let top = refRect.top - floatRect.height - 8 + window.scrollY;
      let left = refRect.left + refRect.width / 2 - floatRect.width / 2 + window.scrollX;

      // Flip below if no room above
      if (top < window.scrollY) {
        top = refRect.bottom + 8 + window.scrollY;
      }

      // Keep within viewport horizontally
      left = Math.max(8, Math.min(left, window.innerWidth - floatRect.width - 8));

      setPosition({ top, left });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [referenceRef]);

  return createPortal(
    <div
      ref={floatingRef}
      style={{ position: "absolute", top: position.top, left: position.left }}
      className="figure-toolbar z-50 flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white px-1 py-0.5 shadow-lg"
      onMouseDown={(e) => e.preventDefault()}
    >
      {(["left", "center", "right"] as const).map((a) => (
        <button
          key={a}
          type="button"
          title={`Align ${a}`}
          className={`${btnBase} ${alignment === a ? btnActive : ""}`}
          onClick={() => onAlign(a)}
        >
          {alignIcons[a]}
        </button>
      ))}

      <div className="mx-0.5 h-5 w-px bg-zinc-200" />

      <button
        type="button"
        title="Crop"
        className={`${btnBase} ${hasCrop ? btnActive : ""}`}
        onClick={onCropToggle}
      >
        {cropIcon}
      </button>

      <div className="mx-0.5 h-5 w-px bg-zinc-200" />

      <button
        type="button"
        title="Delete figure"
        className={`${btnBase} hover:bg-red-50 hover:text-red-600`}
        onClick={onDelete}
      >
        {deleteIcon}
      </button>
    </div>,
    document.body,
  );
}
