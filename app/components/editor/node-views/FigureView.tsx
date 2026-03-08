import { useCallback, useEffect, useRef } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import type { NodeViewProps } from "@tiptap/react";
import { figureNumberingPluginKey } from "../extensions/figure";
import { FigureToolbar } from "./FigureToolbar";
import { useResizeHandle } from "./useResizeHandle";

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

  const figureRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);

  // Build clip-path for crop
  let clipPath: string | undefined;
  if (hasCrop) {
    const top = node.attrs.cropY as number;
    const left = node.attrs.cropX as number;
    const right = 100 - (left + (node.attrs.cropWidth as number));
    const bottom = 100 - (top + (node.attrs.cropHeight as number));
    clipPath = `inset(${top}% ${right}% ${bottom}% ${left}%)`;
  }

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
    if (hasCrop) {
      updateAttributes({ cropX: null, cropY: null, cropWidth: null, cropHeight: null });
    }
  }, [hasCrop, updateAttributes]);

  const handleDelete = useCallback(() => {
    deleteNode();
  }, [deleteNode]);

  // Click on the image area should select this figure node
  const selectFigureNode = useCallback(() => {
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
  }, [editor]);

  // Alignment → flexbox justify
  const justifyContent =
    alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center";

  return (
    <NodeViewWrapper
      as="figure"
      ref={figureRef}
      className={`drawio-figure ${selected ? "drawio-figure--selected" : ""}`}
      style={{ margin: "1rem 0", position: "relative" }}
      data-figure-id={node.attrs.figureId}
    >
      {/* Floating toolbar when selected */}
      {selected && (
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
        style={{ display: "flex", justifyContent, cursor: "pointer" }}
      >
        {imgSrc ? (
          <div
            ref={containerRef}
            className={`drawio-figure__image-container ${selected ? "drawio-figure__image-container--selected" : ""}`}
            style={{ position: "relative", width: width || "100%", maxWidth: "100%" }}
          >
            <img
              src={imgSrc}
              alt={(node.attrs.caption as string) || "Figure"}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: 4,
                opacity: isError ? 0.5 : 1,
                clipPath,
                display: "block",
              }}
              draggable={false}
            />
            {/* Resize handles — visible when selected */}
            {selected && (
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

      {/* Caption with number prefix */}
      <figcaption
        className="drawio-figure__caption"
        style={{ textAlign: "center", fontSize: "0.875rem", color: "#52525b", marginTop: "0.5rem" }}
      >
        <span
          ref={numberRef}
          className="drawio-figure__number"
          contentEditable={false}
          style={{ fontWeight: 600, color: "#27272a", userSelect: "none" }}
        />
        <NodeViewContent className="drawio-figure__caption-text" style={{ display: "inline" }} />
      </figcaption>
    </NodeViewWrapper>
  );
}
