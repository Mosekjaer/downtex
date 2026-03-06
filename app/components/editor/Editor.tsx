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
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { TextAlign } from "@tiptap/extension-text-align";
import { Superscript } from "@tiptap/extension-superscript";
import { Subscript } from "@tiptap/extension-subscript";
import { Highlight } from "@tiptap/extension-highlight";
import { common, createLowlight } from "lowlight";
import { Toolbar } from "./toolbar/Toolbar";
import { MathInline } from "./extensions/math-inline";
import { MathBlock } from "./extensions/math-block";
import { Footnote } from "./extensions/footnote";
import { Figure } from "./extensions/figure";
import { DocumentMention } from "./extensions/document-mention";
import { SectionReference } from "./extensions/section-reference";
import { FigureReference } from "./extensions/figure-reference";
import { FontFamily } from "@tiptap/extension-font-family";
import { FontSize } from "./extensions/font-size";
import { LineHeight } from "./extensions/line-height";
import { ParagraphSpacing } from "./extensions/paragraph-spacing";
import { Indent } from "./extensions/indent";
import { LetterSpacing } from "./extensions/letter-spacing";
import { TableStyle } from "./extensions/table-style";
import { TableCellBackground } from "./extensions/table-cell-bg";
import { ImagePicker } from "~/components/modals/ImagePicker";
import { FigurePicker } from "~/components/modals/FigurePicker";
import { FigureReferencePicker } from "~/components/modals/FigureReferencePicker";
import {
  DocumentMentionPicker,
  type DocumentItem,
} from "~/components/modals/DocumentMentionPicker";
import { getSupabaseClient } from "~/lib/supabase.client";
import { createYjsDoc, initializeFromBase64, exportToBase64 } from "~/lib/yjs";

const lowlight = createLowlight(common);

const ZOOM_STEPS = [50, 75, 100, 125, 150, 200];

export interface ConnectedRepo {
  id: string;
  githubRepo: string;
  displayName: string;
}

export interface EditorProps {
  documentId: string;
  initialStateBase64: string | null;
  editable: boolean;
  workspaceId: string;
  documents?: DocumentItem[];
  connectedRepos?: ConnectedRepo[];
}

export function Editor({
  documentId,
  initialStateBase64,
  editable,
  workspaceId,
  documents = [],
  connectedRepos = [],
}: EditorProps) {
  const fetcher = useFetcher();
  const figureFetcher = useFetcher();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zoom, setZoom] = useState(100);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showFigurePicker, setShowFigurePicker] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [showFigureRefPicker, setShowFigureRefPicker] = useState(false);

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
      FigureReference,
      DocumentMention,
      SectionReference,
      // Text formatting extensions
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
      Superscript,
      Subscript,
      Highlight.configure({ multicolor: true }),
      // Custom formatting extensions
      LineHeight,
      ParagraphSpacing,
      Indent,
      LetterSpacing,
      // Table enhancement extensions
      TableStyle,
      TableCellBackground,
      Collaboration.configure({
        document: yjsDoc,
      }),
    ],
    editorProps: {
      attributes: {
        class: "editor-content focus:outline-none min-h-[800px]",
        style: "font-family: Georgia, serif;",
      },
      transformPastedHTML(html) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        for (const el of doc.querySelectorAll("[style]")) {
          const s = (el as HTMLElement).style;
          const keep: string[] = [];
          if (s.fontWeight) keep.push(`font-weight: ${s.fontWeight}`);
          if (s.fontStyle) keep.push(`font-style: ${s.fontStyle}`);
          if (s.color) keep.push(`color: ${s.color}`);
          if (s.fontSize) keep.push(`font-size: ${s.fontSize}`);
          if (s.fontFamily) keep.push(`font-family: ${s.fontFamily}`);
          if (s.textAlign) keep.push(`text-align: ${s.textAlign}`);
          if (s.backgroundColor) keep.push(`background-color: ${s.backgroundColor}`);
          el.setAttribute("style", keep.length > 0 ? keep.join("; ") : "");
          if (!el.getAttribute("style")) el.removeAttribute("style");
        }
        return doc.body.innerHTML;
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

  // Subscribe to figure updates via Supabase Realtime (T018)
  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`figures:${documentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "figures",
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          const row = payload.new as {
            block_id: string;
            cached_image_path: string | null;
            cached_image_format: string | null;
            status: string;
          };
          if (!editor) return;

          // Find the figure node matching this block_id and update its attributes
          const { doc } = editor.state;
          doc.descendants((node, pos) => {
            if (node.type.name === "figure" && node.attrs.figureId === row.block_id) {
              const attrs: Record<string, unknown> = {};
              if (row.status === "error") {
                attrs.figureStatus = "error";
              } else if (row.cached_image_path) {
                const imageAttr = row.cached_image_format === "svg" ? "svgUrl" : "imageUrl";
                // Create a signed URL since the bucket is private
                void supabase.storage
                  .from("figures")
                  .createSignedUrl(row.cached_image_path, 60 * 60)
                  .then(({ data: urlData }) => {
                    if (!urlData?.signedUrl) return;
                    const finalAttrs = {
                      ...node.attrs,
                      [imageAttr]: urlData.signedUrl,
                      figureStatus: "active",
                    };
                    editor
                      .chain()
                      .command(({ tr }) => {
                        tr.setNodeMarkup(pos, undefined, finalAttrs);
                        return true;
                      })
                      .run();
                  });
                return false;
              }

              if (Object.keys(attrs).length > 0) {
                editor
                  .chain()
                  .command(({ tr }) => {
                    tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
                    return true;
                  })
                  .run();
              }
              return false;
            }
            return true;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId, editor]);

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
    (repo: string, path: string, fileType: string, workspaceRepositoryId?: string) => {
      const figureId = crypto.randomUUID();

      // Insert with placeholder — server will download, store, and return a signed URL
      editor
        ?.chain()
        .focus()
        .insertFigure({
          figureId,
          githubRepo: repo,
          githubPath: path,
          fileType,
        })
        .run();

      // Persist figure metadata to DB
      const formData = new FormData();
      formData.set("intent", "insert-figure");
      formData.set("blockId", figureId);
      formData.set("githubRepo", repo);
      formData.set("githubPath", path);
      formData.set("fileType", fileType);
      if (workspaceRepositoryId) {
        formData.set("workspaceRepositoryId", workspaceRepositoryId);
      }
      figureFetcher.submit(formData, { method: "POST" });
    },
    [editor, figureFetcher],
  );

  // When a figure render completes, update the editor node with the cached URL
  useEffect(() => {
    const data = figureFetcher.data as {
      ok?: boolean;
      blockId?: string;
      cachedUrl?: string;
      cachedFormat?: string;
    } | null;
    if (!data?.ok || !data.blockId || !data.cachedUrl || !editor) return;

    const imageAttr = data.cachedFormat === "svg" ? "svgUrl" : "imageUrl";
    const { doc } = editor.state;
    doc.descendants((node, pos) => {
      if (node.type.name === "figure" && node.attrs.figureId === data.blockId) {
        editor
          .chain()
          .command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              [imageAttr]: data.cachedUrl,
              figureStatus: "active",
            });
            return true;
          })
          .run();
        return false;
      }
      return true;
    });
  }, [figureFetcher.data, editor]);

  const handleInsertFigureRef = useCallback(
    (figureId: string, caption: string) => {
      editor
        ?.chain()
        .focus()
        .insertFigureReference({ targetFigureId: figureId, targetCaption: caption })
        .run();
    },
    [editor],
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
          onInsertFigureRef={() => setShowFigureRefPicker(true)}
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
        connectedRepos={connectedRepos}
      />
      <FigureReferencePicker
        isOpen={showFigureRefPicker}
        onClose={() => setShowFigureRefPicker(false)}
        onSelect={handleInsertFigureRef}
        editor={editor}
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
