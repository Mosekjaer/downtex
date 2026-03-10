import { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import type { NodeViewProps } from "@tiptap/react";
import { figureNumberingPluginKey } from "../extensions/figure";
import { FigureToolbar } from "./FigureToolbar";
import { FigureCropOverlay } from "./FigureCropOverlay";
import { useResizeHandle } from "./useResizeHandle";

/**
 * Renders a cropped image using overflow:hidden so the element shrinks
 * to the visible crop area (no whitespace).
 *
 * cropX/Y/W/H are percentages of the original image (0–100).
 */
/**
 * Renders a cropped image using CSS background-image.
 *
 * background-position percentages have well-defined behavior:
 *   position = (container_size - bg_size) × percentage / 100
 *
 * This gives us: bgPosX = cropX × 100 / (100 - cropW)
 *                bgPosY = cropY × 100 / (100 - cropH)
 */
function CroppedImageDiv({
  src,
  cropX,
  cropY,
  cropW,
  cropH,
  opacity,
  natW,
  natH,
}: {
  src: string;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  opacity: number;
  natW: number;
  natH: number;
}) {
  // background-size: scale so cropW% of image fills container width
  const bgSizeX = (100 / cropW) * 100; // e.g., cropW=60 → 166.67%

  // background-position: derived from the CSS formula
  const bgPosX = cropW < 100 ? (cropX * 100) / (100 - cropW) : 0;
  const bgPosY = cropH < 100 ? (cropY * 100) / (100 - cropH) : 0;

  // Container aspect ratio = crop region aspect ratio
  const cropPixelW = (cropW / 100) * natW;
  const cropPixelH = (cropH / 100) * natH;

  return (
    <div
      role="img"
      aria-label="Figure"
      style={{
        width: "100%",
        aspectRatio: `${cropPixelW} / ${cropPixelH}`,
        backgroundImage: `url(${src})`,
        backgroundSize: `${bgSizeX}% auto`,
        backgroundPosition: `${bgPosX}% ${bgPosY}%`,
        backgroundRepeat: "no-repeat",
        borderRadius: 4,
        opacity,
      }}
    />
  );
}

export function FigureView({
  node,
  updateAttributes,
  selected,
  editor,
  deleteNode,
}: NodeViewProps) {
  const imgSrc = (node.attrs.svgUrl as string) || (node.attrs.imageUrl as string);
  const isError = node.attrs.figureStatus === "error";
  const alignment = (node.attrs.alignment as "left" | "center" | "right") || "center";
  const width = node.attrs.width as string | null;
  const hasCrop =
    node.attrs.cropX != null &&
    node.attrs.cropY != null &&
    node.attrs.cropWidth != null &&
    node.attrs.cropHeight != null;

  // Exit crop mode when deselected — derive from selected state
  const [isCropping, setIsCropping] = useState(false);
  const activeCrop = selected ? isCropping : false;

  const figureRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const numberRef = useRef<HTMLSpanElement>(null);

  // Crop: when active, we use overflow:hidden on a wrapper sized to the crop region,
  // and position the image with negative margins so only the cropped area is visible.
  // This avoids whitespace unlike clip-path.
  const showCropped = hasCrop && !activeCrop;
  const cropX = (node.attrs.cropX as number) || 0;
  const cropY = (node.attrs.cropY as number) || 0;
  const cropW = (node.attrs.cropWidth as number) || 100;
  const cropH = (node.attrs.cropHeight as number) || 100;

  // Resize handler — resizes the container div
  const handleResize = useCallback(
    (newWidth: number) => {
      updateAttributes({ width: `${newWidth}px` });
    },
    [updateAttributes],
  );

  const { startResize } = useResizeHandle({
    onResize: handleResize,
    minWidth: 100,
    maxWidth: 672,
  });

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const container = containerRef.current;
      if (container) startResize(e, container);
    },
    [startResize],
  );

  // Figure numbering
  useEffect(() => {
    function updateNumber() {
      if (!editor.view || !numberRef.current) return;
      const pluginState = figureNumberingPluginKey.getState(editor.view.state);
      const figureId = node.attrs.figureId as string;
      const num = pluginState?.get(figureId);
      numberRef.current.textContent = num ? `Figur ${num}: ` : "Figur: ";
    }

    updateNumber();

    const handler = () => updateNumber();
    editor.on("transaction", handler);
    return () => {
      editor.off("transaction", handler);
    };
  }, [editor, node.attrs.figureId]);

  // Toolbar handlers
  const handleAlign = useCallback(
    (a: "left" | "center" | "right") => {
      updateAttributes({ alignment: a });
    },
    [updateAttributes],
  );

  const handleCropToggle = useCallback(() => {
    if (isCropping) {
      setIsCropping(false);
    } else {
      setIsCropping(true);
    }
  }, [isCropping]);

  const handleCropApply = useCallback(
    (crop: { x: number; y: number; w: number; h: number }) => {
      updateAttributes({
        cropX: Math.round(crop.x * 100) / 100,
        cropY: Math.round(crop.y * 100) / 100,
        cropWidth: Math.round(crop.w * 100) / 100,
        cropHeight: Math.round(crop.h * 100) / 100,
      });
      setIsCropping(false);
    },
    [updateAttributes],
  );

  const handleCropCancel = useCallback(() => {
    setIsCropping(false);
  }, []);

  const handleDelete = useCallback(() => {
    deleteNode();
  }, [deleteNode]);

  // Click on the image area should select this figure node
  const selectFigureNode = useCallback(() => {
    if (activeCrop) return; // don't interfere with crop interaction
    const el = figureRef.current;
    if (!el) return;
    const pos = editor.view.posAtDOM(el, 0);
    const resolved = editor.view.state.doc.resolve(pos);
    for (let d = resolved.depth; d >= 0; d--) {
      if (resolved.node(d).type.name === "figure") {
        const sel = NodeSelection.create(editor.view.state.doc, resolved.before(d));
        editor.view.dispatch(editor.view.state.tr.setSelection(sel));
        editor.view.focus();
        return;
      }
    }
  }, [editor, activeCrop]);

  // Alignment → flexbox justify
  const justifyContent =
    alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center";

  // Initial crop rect for the overlay
  const initialCrop = hasCrop
    ? {
        x: node.attrs.cropX as number,
        y: node.attrs.cropY as number,
        w: node.attrs.cropWidth as number,
        h: node.attrs.cropHeight as number,
      }
    : null;

  return (
    <NodeViewWrapper
      as="figure"
      ref={figureRef}
      className={`drawio-figure ${selected ? "drawio-figure--selected" : ""}`}
      style={{ margin: "1rem 0", position: "relative" }}
      data-figure-id={node.attrs.figureId}
    >
      {/* Floating toolbar when selected (hide during crop) */}
      {selected && !activeCrop && (
        <FigureToolbar
          referenceRef={figureRef}
          alignment={alignment}
          hasCrop={hasCrop}
          onAlign={handleAlign}
          onCropToggle={handleCropToggle}
          onDelete={handleDelete}
        />
      )}

      {/* Image preview — click selects the figure node */}
      <div
        className="drawio-figure__preview"
        contentEditable={false}
        onClick={selectFigureNode}
        style={{ display: "flex", justifyContent, cursor: activeCrop ? "default" : "pointer" }}
      >
        {imgSrc ? (
          <div
            ref={containerRef}
            className={`drawio-figure__image-container ${selected && !activeCrop ? "drawio-figure__image-container--selected" : ""}`}
            style={{ position: "relative", width: width || "100%", maxWidth: "100%" }}
          >
            {showCropped && naturalSize ? (
              <CroppedImageDiv
                src={imgSrc}
                cropX={cropX}
                cropY={cropY}
                cropW={cropW}
                cropH={cropH}
                opacity={isError ? 0.5 : 1}
                natW={naturalSize.w}
                natH={naturalSize.h}
              />
            ) : (
              <img
                ref={imgRef}
                src={imgSrc}
                alt={(node.attrs.caption as string) || "Figure"}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                  }
                }}
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: 4,
                  opacity: isError ? 0.5 : 1,
                  display: "block",
                }}
                draggable={false}
              />
            )}

            {/* Crop overlay */}
            {activeCrop && (
              <FigureCropOverlay
                imageRef={imgRef}
                initialCrop={initialCrop}
                onApply={handleCropApply}
                onCancel={handleCropCancel}
              />
            )}

            {/* Resize handles — visible when selected but not cropping */}
            {selected && !activeCrop && (
              <>
                <span
                  className="figure-resize-handle figure-resize-handle--se"
                  onMouseDown={onResizeMouseDown}
                />
                <span
                  className="figure-resize-handle figure-resize-handle--sw"
                  onMouseDown={onResizeMouseDown}
                />
              </>
            )}
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              height: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px dashed #d4d4d8",
              borderRadius: 6,
              color: "#a1a1aa",
              fontSize: 14,
            }}
          >
            Loading figure...
          </div>
        )}
      </div>

      {/* Error overlay */}
      {isError && (
        <div
          contentEditable={false}
          style={{
            textAlign: "center",
            fontSize: "0.75rem",
            color: "#b45309",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 4,
            padding: "4px 8px",
            marginTop: 4,
          }}
        >
          Source file unavailable
        </div>
      )}

      {/* Caption with number prefix — uses flex to keep number and text on one line */}
      <figcaption
        className="drawio-figure__caption"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "baseline",
          gap: 0,
          fontSize: "0.875rem",
          color: "#52525b",
          marginTop: "0.5rem",
        }}
      >
        <span
          ref={numberRef}
          className="drawio-figure__number"
          contentEditable={false}
          style={{ fontWeight: 600, color: "#27272a", userSelect: "none", flexShrink: 0 }}
        />
        <NodeViewContent className="drawio-figure__caption-text" />
      </figcaption>
    </NodeViewWrapper>
  );
}
