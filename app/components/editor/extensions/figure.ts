import { Node, mergeAttributes } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { FigureView } from "../node-views/FigureView";

/**
 * Figure extension for GitHub-sourced images and Draw.io diagrams.
 *
 * Renders a block node with a cached image (or loading placeholder),
 * an editable caption, and interactive controls (resize, align, crop).
 * Figures are auto-numbered via a ProseMirror plugin.
 */

export const figureNumberingPluginKey = new PluginKey<Map<string, number>>("figureNumbering");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    figure: {
      insertFigure: (attrs: {
        figureId: string;
        githubRepo: string;
        githubPath: string;
        caption?: string;
        svgUrl?: string;
        imageUrl?: string;
        fileType?: string;
      }) => ReturnType;
      setFigureAlignment: (alignment: "left" | "center" | "right") => ReturnType;
      setFigureWidth: (width: string) => ReturnType;
      setFigureCrop: (crop: {
        cropX: number;
        cropY: number;
        cropWidth: number;
        cropHeight: number;
      }) => ReturnType;
      removeFigureCrop: () => ReturnType;
    };
  }
}

/**
 * Find the figure node at or around the current selection.
 * The selection may be inside the caption (inline content).
 */
function findFigureAround(state: { selection: { $from: { depth: number; node: (d: number) => ProseMirrorNode; before: (d: number) => number } } }) {
  const { $from } = state.selection;
  for (let d = $from.depth; d >= 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "figure") {
      return { node, pos: $from.before(d) };
    }
  }
  return null;
}

export const Figure = Node.create({
  name: "figure",

  group: "block",
  defining: true,

  // The diagram area is not editable; the caption is.
  content: "inline*",

  addAttributes() {
    return {
      figureId: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-figure-id") || "",
      },
      githubRepo: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-github-repo") || "",
      },
      githubPath: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-github-path") || "",
      },
      caption: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-caption") || "",
      },
      svgUrl: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-svg-url") || null,
      },
      imageUrl: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-image-url") || null,
      },
      fileType: {
        default: "drawio",
        parseHTML: (element) => element.getAttribute("data-file-type") || "drawio",
      },
      figureStatus: {
        default: "active",
        parseHTML: (element) => element.getAttribute("data-figure-status") || "active",
      },
      alignment: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-alignment") || "center",
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-width") || null,
      },
      cropX: {
        default: null,
        parseHTML: (element) => {
          const v = element.getAttribute("data-crop-x");
          return v ? Number(v) : null;
        },
      },
      cropY: {
        default: null,
        parseHTML: (element) => {
          const v = element.getAttribute("data-crop-y");
          return v ? Number(v) : null;
        },
      },
      cropWidth: {
        default: null,
        parseHTML: (element) => {
          const v = element.getAttribute("data-crop-width");
          return v ? Number(v) : null;
        },
      },
      cropHeight: {
        default: null,
        parseHTML: (element) => {
          const v = element.getAttribute("data-crop-height");
          return v ? Number(v) : null;
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure.drawio-figure",
      },
    ];
  },

  renderHTML({ node }) {
    const imgSrc = node.attrs.svgUrl || node.attrs.imageUrl;
    const isError = node.attrs.figureStatus === "error";
    const alignment = node.attrs.alignment as string;
    const width = node.attrs.width as string | null;

    const figureStyle = alignmentToMarginStyle(alignment);

    // Build crop clip-path if set
    let imgStyle = `max-width:100%;height:auto;border-radius:6px;${isError ? "opacity:0.5;" : ""}`;
    if (width) {
      imgStyle += `width:${width};`;
    }
    const clipPath = buildClipPath(node.attrs);
    if (clipPath) {
      imgStyle += `clip-path:${clipPath};`;
    }

    const previewContent = imgSrc
      ? [
          "img",
          {
            src: imgSrc,
            alt: node.attrs.caption || "Figure",
            style: imgStyle,
          },
        ]
      : [
          "div",
          {
            class: "drawio-figure__placeholder",
            style:
              "width:100%;height:200px;display:flex;align-items:center;justify-content:center;border:2px dashed #d4d4d8;border-radius:6px;color:#a1a1aa;font-size:14px;",
          },
          "Loading figure...",
        ];

    const children: unknown[] = [
      [
        "div",
        {
          class: "drawio-figure__preview",
          contenteditable: "false",
        },
        previewContent,
      ],
    ];

    if (isError) {
      children.push([
        "div",
        {
          class: "drawio-figure__error",
          contenteditable: "false",
          style:
            "text-align:center;font-size:0.75rem;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:4px;padding:4px 8px;margin-top:4px;",
        },
        "Source file unavailable",
      ]);
    }

    children.push([
      "figcaption",
      {
        class: "drawio-figure__caption",
        style: "text-align:center;font-size:0.875rem;color:#52525b;margin-top:0.5rem;",
      },
      0,
    ]);

    return [
      "figure",
      mergeAttributes({
        class: "drawio-figure",
        style: figureStyle,
        "data-figure-id": node.attrs.figureId,
        "data-github-repo": node.attrs.githubRepo,
        "data-github-path": node.attrs.githubPath,
        "data-caption": node.attrs.caption,
        "data-svg-url": node.attrs.svgUrl,
        "data-image-url": node.attrs.imageUrl,
        "data-file-type": node.attrs.fileType,
        "data-figure-status": node.attrs.figureStatus,
        "data-alignment": node.attrs.alignment,
        "data-width": node.attrs.width,
        "data-crop-x": node.attrs.cropX,
        "data-crop-y": node.attrs.cropY,
        "data-crop-width": node.attrs.cropWidth,
        "data-crop-height": node.attrs.cropHeight,
      }),
      ...children,
    ] as unknown as [string, Record<string, unknown>, ...unknown[]];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureView);
  },

  addCommands() {
    return {
      insertFigure:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
            content: attrs.caption ? [{ type: "text", text: attrs.caption }] : [],
          });
        },
      setFigureAlignment:
        (alignment) =>
        ({ state, dispatch }) => {
          const found = findFigureAround(state);
          if (!found || !dispatch) return false;
          const { tr } = state;
          tr.setNodeMarkup(found.pos, undefined, { ...found.node.attrs, alignment });
          dispatch(tr);
          return true;
        },
      setFigureWidth:
        (width) =>
        ({ state, dispatch }) => {
          const found = findFigureAround(state);
          if (!found || !dispatch) return false;
          const { tr } = state;
          tr.setNodeMarkup(found.pos, undefined, { ...found.node.attrs, width });
          dispatch(tr);
          return true;
        },
      setFigureCrop:
        (crop) =>
        ({ state, dispatch }) => {
          const found = findFigureAround(state);
          if (!found || !dispatch) return false;
          const { tr } = state;
          tr.setNodeMarkup(found.pos, undefined, { ...found.node.attrs, ...crop });
          dispatch(tr);
          return true;
        },
      removeFigureCrop:
        () =>
        ({ state, dispatch }) => {
          const found = findFigureAround(state);
          if (!found || !dispatch) return false;
          const { tr } = state;
          tr.setNodeMarkup(found.pos, undefined, {
            ...found.node.attrs,
            cropX: null,
            cropY: null,
            cropWidth: null,
            cropHeight: null,
          });
          dispatch(tr);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<Map<string, number>>({
        key: figureNumberingPluginKey,

        state: {
          init: (_, state) => {
            return buildFigureNumberMap(state.doc);
          },

          apply: (tr, oldMap) => {
            if (!tr.docChanged) return oldMap;
            return buildFigureNumberMap(tr.doc);
          },
        },

        view() {
          return {
            update(view) {
              const map = figureNumberingPluginKey.getState(view.state);
              if (!map) return;

              const figures = view.dom.querySelectorAll(".drawio-figure__number");
              figures.forEach((el) => {
                const figureEl = el.closest(".drawio-figure");
                if (!figureEl) return;
                const pos = view.posAtDOM(figureEl, 0);
                const resolvedPos = view.state.doc.resolve(pos);
                const figureNode =
                  resolvedPos.parent.type.name === "figure"
                    ? resolvedPos.parent
                    : resolvedPos.nodeAfter;
                if (!figureNode || figureNode.type.name !== "figure") return;

                const figId = figureNode.attrs.figureId as string;
                const num = map.get(figId);
                el.textContent = num ? `Figur ${num}: ` : "Figur: ";
              });
            },
          };
        },
      }),
    ];
  },
});

function buildFigureNumberMap(doc: ProseMirrorNode): Map<string, number> {
  const map = new Map<string, number>();
  let counter = 0;
  doc.descendants((node: ProseMirrorNode) => {
    if (node.type.name === "figure") {
      counter++;
      const id = node.attrs.figureId as string;
      if (id) map.set(id, counter);
    }
    return true;
  });
  return map;
}

function alignmentToMarginStyle(alignment: string): string {
  switch (alignment) {
    case "left":
      return "margin-right:auto;";
    case "right":
      return "margin-left:auto;";
    default:
      return "margin-left:auto;margin-right:auto;";
  }
}

function buildClipPath(attrs: Record<string, unknown>): string | null {
  const { cropX, cropY, cropWidth, cropHeight } = attrs;
  if (cropX == null || cropY == null || cropWidth == null || cropHeight == null) return null;
  const top = cropY as number;
  const left = cropX as number;
  const right = 100 - (left + (cropWidth as number));
  const bottom = 100 - (top + (cropHeight as number));
  return `inset(${top}% ${right}% ${bottom}% ${left}%)`;
}
