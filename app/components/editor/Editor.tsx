import { useRef, useEffect, useCallback, useState } from "react";
import { useFetcher } from "react-router";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { Toolbar } from "./toolbar/Toolbar";
import { MathInline } from "./extensions/math-inline";
import { MathBlock } from "./extensions/math-block";
import { Footnote } from "./extensions/footnote";
import { Figure } from "./extensions/figure";
import { createYjsDoc, initializeFromBase64, exportToBase64 } from "~/lib/yjs";

const lowlight = createLowlight(common);

const ZOOM_STEPS = [50, 75, 100, 125, 150, 200];

interface EditorProps {
  documentId: string;
  initialStateBase64: string | null;
  editable: boolean;
}

export function Editor({ documentId, initialStateBase64, editable }: EditorProps) {
  const fetcher = useFetcher();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const yjsDocRef = useRef(createYjsDoc());
  const [zoom, setZoom] = useState(100);

  // Initialize Yjs doc from base64 state if provided
  useEffect(() => {
    if (initialStateBase64) {
      initializeFromBase64(yjsDocRef.current, initialStateBase64);
    }
  }, [initialStateBase64]);

  const saveState = useCallback(() => {
    if (!editable) return;
    const base64 = exportToBase64(yjsDocRef.current);
    const formData = new FormData();
    formData.set("intent", "save-yjs-state");
    formData.set("state", base64);
    fetcher.submit(formData, { method: "POST" });
  }, [editable, fetcher]);

  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      MathInline,
      MathBlock,
      Footnote,
      Figure,
    ],
    content: "<p></p>",
    editorProps: {
      attributes: {
        class: "editor-content focus:outline-none min-h-[800px]",
        style: "font-family: Georgia, serif;",
      },
    },
    onUpdate: () => {
      if (!editable) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        saveState();
      }, 2000);
    },
  });

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((z) => {
      const next = ZOOM_STEPS.find((s) => s > z);
      return next ?? z;
    });
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const prev = [...ZOOM_STEPS].reverse().find((s) => s < z);
      return prev ?? z;
    });
  }, []);

  const resetZoom = useCallback(() => setZoom(100), []);

  if (!editor) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm text-zinc-400">Loading editor...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {editable && <Toolbar editor={editor} />}
      <div className="document-canvas flex-1 overflow-y-auto px-4 py-8">
        <div
          className="a4-page"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            marginBottom: zoom !== 100 ? `${(zoom / 100 - 1) * -400}px` : undefined,
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
      <div className="zoom-controls">
        <button
          type="button"
          className="zoom-btn"
          onClick={zoomOut}
          title="Zoom out"
          disabled={zoom <= ZOOM_STEPS[0]}
        >
          −
        </button>
        <button
          type="button"
          className="zoom-label"
          onClick={resetZoom}
          title="Reset zoom"
          style={{ cursor: "pointer", background: "none", border: "none" }}
        >
          {zoom}%
        </button>
        <button
          type="button"
          className="zoom-btn"
          onClick={zoomIn}
          title="Zoom in"
          disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
        >
          +
        </button>
      </div>
    </div>
  );
}
