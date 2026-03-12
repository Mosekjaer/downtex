import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { useFetcher } from "react-router";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Image } from "@tiptap/extension-image";
import { Collaboration } from "@tiptap/extension-collaboration";
import { common, createLowlight } from "lowlight";
import { Toolbar } from "./toolbar/Toolbar";
import { MathInline } from "./extensions/math-inline";
import { MathBlock } from "./extensions/math-block";
import { Footnote } from "./extensions/footnote";
import { Figure } from "./extensions/figure";
import { DocumentMention } from "./extensions/document-mention";
import { SectionReference } from "./extensions/section-reference";
import { ImagePicker } from "~/components/modals/ImagePicker";
import { FigurePicker } from "~/components/modals/FigurePicker";
import {
  DocumentMentionPicker,
  type DocumentItem,
} from "~/components/modals/DocumentMentionPicker";
import { createYjsDoc, initializeFromBase64, exportToBase64 } from "~/lib/yjs";

const lowlight = createLowlight(common);

const ZOOM_STEPS = [50, 75, 100, 125, 150, 200];

export interface EditorProps {
  documentId: string;
  initialStateBase64: string | null;
  editable: boolean;
  workspaceId: string;
  documents?: DocumentItem[];
}

export function Editor({
  documentId,
  initialStateBase64,
  editable,
  workspaceId,
  documents = [],
}: EditorProps) {
  const fetcher = useFetcher();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zoom, setZoom] = useState(100);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showFigurePicker, setShowFigurePicker] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);

  // Create and initialize Yjs doc once, stable across re-renders
  const yjsDoc = useMemo(() => {
    const doc = createYjsDoc();
    if (initialStateBase64) {
      initializeFromBase64(doc, initialStateBase64);
    }
    return doc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  // Stable action URL for this document — used by both debounced save and unmount save
  const actionUrl = `/workspace/${workspaceId}/${documentId}`;

  const saveState = useCallback(() => {
    if (!editable) return;
    const base64 = exportToBase64(yjsDoc);
    const formData = new FormData();
    formData.set("intent", "save-yjs-state");
    formData.set("state", base64);
    fetcher.submit(formData, { method: "POST", action: actionUrl });
  }, [editable, fetcher, yjsDoc, actionUrl]);

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3, 4] },
        undoRedo: false, // Yjs handles undo/redo
      }),
      Underline,
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({ inline: false, allowBase64: true }),
      MathInline,
      MathBlock,
      Footnote,
      Figure,
      DocumentMention,
      SectionReference,
      Collaboration.configure({
        document: yjsDoc,
      }),
    ],
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

  // Save on unmount and clean up
  // Use refs so the cleanup captures the correct values even with [] deps
  const actionUrlRef = useRef(actionUrl);
  actionUrlRef.current = actionUrl;
  const yjsDocRef = useRef(yjsDoc);
  yjsDocRef.current = yjsDoc;

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Save before leaving — target the explicit action URL for this document
      // so the state goes to the correct document even if the route has changed
      if (editable) {
        const base64 = exportToBase64(yjsDocRef.current);
        const formData = new FormData();
        formData.set("intent", "save-yjs-state");
        formData.set("state", base64);
        // Use fetch directly since the component's fetcher may not be reliable during unmount
        fetch(actionUrlRef.current, { method: "POST", body: formData, keepalive: true });
      }
      yjsDocRef.current.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleInsertImage = useCallback(
    (src: string, alt: string) => {
      editor?.chain().focus().setImage({ src, alt }).run();
    },
    [editor],
  );

  const handleInsertFigure = useCallback(
    (repo: string, path: string) => {
      const figureId = crypto.randomUUID();
      editor?.chain().focus().insertFigure({ figureId, githubRepo: repo, githubPath: path }).run();

      // Persist figure metadata to DB
      const formData = new FormData();
      formData.set("intent", "insert-figure");
      formData.set("blockId", figureId);
      formData.set("githubRepo", repo);
      formData.set("githubPath", path);
      fetcher.submit(formData, { method: "POST" });
    },
    [editor, fetcher],
  );

  const handleInsertMention = useCallback(
    (doc: DocumentItem) => {
      editor
        ?.chain()
        .focus()
        .insertDocumentMention({
          documentId: doc.id,
          documentTitle: doc.title,
          workspaceId,
        })
        .run();
    },
    [editor, workspaceId],
  );

  if (!editor) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm text-zinc-400">Loading editor...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {editable && (
        <Toolbar
          editor={editor}
          onInsertImage={() => setShowImagePicker(true)}
          onInsertFigure={() => setShowFigurePicker(true)}
          onInsertMention={() => setShowMentionPicker(true)}
        />
      )}
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

      {/* Modals */}
      <ImagePicker
        isOpen={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onInsert={handleInsertImage}
      />
      <FigurePicker
        isOpen={showFigurePicker}
        onClose={() => setShowFigurePicker(false)}
        onSelect={handleInsertFigure}
      />
      <DocumentMentionPicker
        isOpen={showMentionPicker}
        onClose={() => setShowMentionPicker(false)}
        onSelect={handleInsertMention}
        documents={documents}
      />
    </div>
  );
}
