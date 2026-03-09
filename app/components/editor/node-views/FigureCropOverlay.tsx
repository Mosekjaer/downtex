import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

interface CropRect {
  x: number; // percentage 0-100
  y: number;
  w: number;
  h: number;
}

interface FigureCropOverlayProps {
  /** Ref to the image element to crop over */
  imageRef: RefObject<HTMLImageElement | null>;
  /** Initial crop (if already cropped) */
  initialCrop: CropRect | null;
  /** Called with final crop percentages */
  onApply: (crop: CropRect) => void;
  onCancel: () => void;
}

const MIN_SIZE = 5; // minimum crop size in percent

export function FigureCropOverlay({
  imageRef,
  initialCrop,
  onApply,
  onCancel,
}: FigureCropOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState<CropRect>(initialCrop || { x: 10, y: 10, w: 80, h: 80 });
  const dragRef = useRef<{
    type: "move" | "nw" | "ne" | "sw" | "se";
    startMouseX: number;
    startMouseY: number;
    startCrop: CropRect;
    imgWidth: number;
    imgHeight: number;
  } | null>(null);

  const getImageRect = useCallback(() => {
    return imageRef.current?.getBoundingClientRect() ?? new DOMRect();
  }, [imageRef]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, type: "move" | "nw" | "ne" | "sw" | "se") => {
      e.preventDefault();
      e.stopPropagation();
      const imgRect = getImageRect();
      dragRef.current = {
        type,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startCrop: { ...crop },
        imgWidth: imgRect.width,
        imgHeight: imgRect.height,
      };
    },
    [crop, getImageRect],
  );

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = ((e.clientX - drag.startMouseX) / drag.imgWidth) * 100;
      const dy = ((e.clientY - drag.startMouseY) / drag.imgHeight) * 100;
      const sc = drag.startCrop;

      let newCrop: CropRect;

      switch (drag.type) {
        case "move": {
          let nx = sc.x + dx;
          let ny = sc.y + dy;
          nx = Math.max(0, Math.min(100 - sc.w, nx));
          ny = Math.max(0, Math.min(100 - sc.h, ny));
          newCrop = { x: nx, y: ny, w: sc.w, h: sc.h };
          break;
        }
        case "nw": {
          const nx = Math.max(0, Math.min(sc.x + sc.w - MIN_SIZE, sc.x + dx));
          const ny = Math.max(0, Math.min(sc.y + sc.h - MIN_SIZE, sc.y + dy));
          newCrop = {
            x: nx,
            y: ny,
            w: sc.x + sc.w - nx,
            h: sc.y + sc.h - ny,
          };
          break;
        }
        case "ne": {
          const nw = Math.max(MIN_SIZE, Math.min(100 - sc.x, sc.w + dx));
          const ny = Math.max(0, Math.min(sc.y + sc.h - MIN_SIZE, sc.y + dy));
          newCrop = {
            x: sc.x,
            y: ny,
            w: nw,
            h: sc.y + sc.h - ny,
          };
          break;
        }
        case "sw": {
          const nx = Math.max(0, Math.min(sc.x + sc.w - MIN_SIZE, sc.x + dx));
          const nh = Math.max(MIN_SIZE, Math.min(100 - sc.y, sc.h + dy));
          newCrop = {
            x: nx,
            y: sc.y,
            w: sc.x + sc.w - nx,
            h: nh,
          };
          break;
        }
        case "se": {
          const nw = Math.max(MIN_SIZE, Math.min(100 - sc.x, sc.w + dx));
          const nh = Math.max(MIN_SIZE, Math.min(100 - sc.y, sc.h + dy));
          newCrop = { x: sc.x, y: sc.y, w: nw, h: nh };
          break;
        }
        default:
          return;
      }

      setCrop(newCrop);
    }

    function onMouseUp() {
      dragRef.current = null;
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // Prevent ProseMirror from handling events in the overlay
  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      ref={overlayRef}
      className="figure-crop-overlay"
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
    >
      {/* Dark mask — four rectangles around the crop area */}
      <div
        className="figure-crop-mask"
        style={{ top: 0, left: 0, right: 0, height: `${crop.y}%` }}
      />
      <div
        className="figure-crop-mask"
        style={{
          top: `${crop.y}%`,
          left: 0,
          width: `${crop.x}%`,
          height: `${crop.h}%`,
        }}
      />
      <div
        className="figure-crop-mask"
        style={{
          top: `${crop.y}%`,
          right: 0,
          width: `${100 - crop.x - crop.w}%`,
          height: `${crop.h}%`,
        }}
      />
      <div
        className="figure-crop-mask"
        style={{
          bottom: 0,
          left: 0,
          right: 0,
          height: `${100 - crop.y - crop.h}%`,
        }}
      />

      {/* Crop region border — draggable to move */}
      <div
        className="figure-crop-region"
        style={{
          top: `${crop.y}%`,
          left: `${crop.x}%`,
          width: `${crop.w}%`,
          height: `${crop.h}%`,
        }}
        onMouseDown={(e) => handleMouseDown(e, "move")}
      >
        {/* Rule of thirds grid lines */}
        <div className="figure-crop-grid" />
      </div>

      {/* Corner handles */}
      <span
        className="figure-crop-handle figure-crop-handle--nw"
        style={{ top: `${crop.y}%`, left: `${crop.x}%` }}
        onMouseDown={(e) => handleMouseDown(e, "nw")}
      />
      <span
        className="figure-crop-handle figure-crop-handle--ne"
        style={{ top: `${crop.y}%`, left: `${crop.x + crop.w}%` }}
        onMouseDown={(e) => handleMouseDown(e, "ne")}
      />
      <span
        className="figure-crop-handle figure-crop-handle--sw"
        style={{ top: `${crop.y + crop.h}%`, left: `${crop.x}%` }}
        onMouseDown={(e) => handleMouseDown(e, "sw")}
      />
      <span
        className="figure-crop-handle figure-crop-handle--se"
        style={{ top: `${crop.y + crop.h}%`, left: `${crop.x + crop.w}%` }}
        onMouseDown={(e) => handleMouseDown(e, "se")}
      />

      {/* Apply / Cancel buttons */}
      <div
        className="figure-crop-actions"
        style={{
          top: `${crop.y + crop.h}%`,
          left: `${crop.x + crop.w / 2}%`,
        }}
      >
        <button
          type="button"
          className="figure-crop-btn figure-crop-btn--apply"
          onClick={() => onApply(crop)}
        >
          Apply
        </button>
        <button
          type="button"
          className="figure-crop-btn figure-crop-btn--cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
