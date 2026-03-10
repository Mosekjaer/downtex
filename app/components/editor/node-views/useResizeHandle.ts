import { useCallback, useRef } from "react";

interface UseResizeHandleOptions {
  onResize: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
}

export function useResizeHandle({ onResize, minWidth = 100, maxWidth = 672 }: UseResizeHandleOptions) {
  const isResizing = useRef(false);

  const startResize = useCallback(
    (e: React.MouseEvent, imgEl: HTMLElement) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth = imgEl.getBoundingClientRect().width;

      // Read zoom scale from the .a4-page ancestor
      const pageEl = imgEl.closest(".a4-page") as HTMLElement | null;
      const transform = pageEl ? getComputedStyle(pageEl).transform : "";
      let scale = 1;
      if (transform && transform !== "none") {
        const match = transform.match(/matrix\(([^,]+)/);
        if (match) scale = parseFloat(match[1]) || 1;
      }

      isResizing.current = true;

      function onMouseMove(ev: MouseEvent) {
        const dx = (ev.clientX - startX) / scale;
        const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + dx));
        imgEl.style.width = `${newWidth}px`;
      }

      function onMouseUp() {
        isResizing.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        const finalWidth = imgEl.getBoundingClientRect().width / scale;
        onResize(Math.round(Math.max(minWidth, Math.min(maxWidth, finalWidth))));
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [onResize, minWidth, maxWidth],
  );

  return { startResize };
}
