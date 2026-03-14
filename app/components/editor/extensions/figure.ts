import { Node, mergeAttributes } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Figure extension for GitHub-sourced images and Draw.io diagrams.
 *
 * Renders a block node with a static cached image (or loading placeholder),
 * plus an editable caption below prefixed with "Figur N: ".
 * Figures are auto-numbered via a ProseMirror plugin that maintains
 * a {figureId → number} mapping.
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
    };
  }
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

    const previewContent = imgSrc
      ? [
          "img",
          {
            src: imgSrc,
            alt: node.attrs.caption || "Figure",
            style: `max-width:100%;height:auto;border-radius:6px;${isError ? "opacity:0.5;" : ""}`,
          },
        ]
      : [
          "div",
          {
            class: "drawio-figure__placeholder",
            style:
              "width:100%;height:200px;display:flex;align-items:center;justify-content:center;border:2px dashed #d4d4d8;border-radius:6px;color:#a1a1aa;font-size:14px;",
          },
          "Rendering figure...",
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

    // Editable caption with number prefix rendered by NodeView
    children.push([
      "figcaption",
      {
        class: "drawio-figure__caption",
        style: "text-align:center;font-size:0.875rem;color:#52525b;margin-top:0.5rem;",
      },
      0, // hole for inline content (caption)
    ]);

    return [
      "figure",
      mergeAttributes({
        class: "drawio-figure",
        "data-figure-id": node.attrs.figureId,
        "data-github-repo": node.attrs.githubRepo,
        "data-github-path": node.attrs.githubPath,
        "data-caption": node.attrs.caption,
        "data-svg-url": node.attrs.svgUrl,
        "data-image-url": node.attrs.imageUrl,
        "data-file-type": node.attrs.fileType,
        "data-figure-status": node.attrs.figureStatus,
      }),
      ...children,
    ] as unknown as [string, Record<string, unknown>, ...unknown[]];
  },

  addNodeView() {
    return ({ node, editor }) => {
      // Outer figure element
      const dom = document.createElement("figure");
      dom.classList.add("drawio-figure");
      dom.style.cssText = "margin:1rem 0;";

      // Image preview area (non-editable)
      const preview = document.createElement("div");
      preview.classList.add("drawio-figure__preview");
      preview.contentEditable = "false";
      updatePreview(preview, node);
      dom.appendChild(preview);

      // Error overlay
      const errorEl = document.createElement("div");
      errorEl.classList.add("drawio-figure__error");
      errorEl.contentEditable = "false";
      errorEl.style.cssText =
        "text-align:center;font-size:0.75rem;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:4px;padding:4px 8px;margin-top:4px;display:none;";
      errorEl.textContent = "Source file unavailable";
      if (node.attrs.figureStatus === "error") {
        errorEl.style.display = "block";
      }
      dom.appendChild(errorEl);

      // Caption area with "Figur N: " prefix
      const captionWrapper = document.createElement("figcaption");
      captionWrapper.classList.add("drawio-figure__caption");
      captionWrapper.style.cssText =
        "text-align:center;font-size:0.875rem;color:#52525b;margin-top:0.5rem;";

      // Non-editable "Figur N: " prefix
      const numberPrefix = document.createElement("span");
      numberPrefix.classList.add("drawio-figure__number");
      numberPrefix.contentEditable = "false";
      numberPrefix.style.cssText = "font-weight:600;color:#27272a;user-select:none;";
      captionWrapper.appendChild(numberPrefix);

      // Editable caption content (contentDOM hole)
      const contentDOM = document.createElement("span");
      contentDOM.classList.add("drawio-figure__caption-text");
      captionWrapper.appendChild(contentDOM);
      dom.appendChild(captionWrapper);

      // Update the figure number from plugin state
      function updateNumber(view: EditorView) {
        const pluginState = figureNumberingPluginKey.getState(view.state);
        const figureId = node.attrs.figureId as string;
        const num = pluginState?.get(figureId);
        numberPrefix.textContent = num ? `Figur ${num}: ` : "Figur: ";
      }

      // Initial number update (deferred to ensure plugin state is available)
      setTimeout(() => {
        if (editor.view) updateNumber(editor.view);
      }, 0);

      return {
        dom,
        contentDOM,
        update(updatedNode) {
          if (updatedNode.type.name !== "figure") return false;
          node = updatedNode;
          updatePreview(preview, updatedNode);

          // Update error state
          errorEl.style.display = updatedNode.attrs.figureStatus === "error" ? "block" : "none";

          // Update figure number
          if (editor.view) updateNumber(editor.view);

          return true;
        },
        selectNode() {
          dom.classList.add("ProseMirror-selectednode");
        },
        deselectNode() {
          dom.classList.remove("ProseMirror-selectednode");
        },
        ignoreMutation(mutation) {
          // Ignore mutations in the non-editable areas
          if (mutation.target === preview || preview.contains(mutation.target as globalThis.Node)) {
            return true;
          }
          if (mutation.target === errorEl || errorEl.contains(mutation.target as globalThis.Node)) {
            return true;
          }
          if (
            mutation.target === numberPrefix ||
            numberPrefix.contains(mutation.target as globalThis.Node)
          ) {
            return true;
          }
          return false;
        },
      };
    };
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
              // After each transaction, update all figure number prefixes in the DOM
              const map = figureNumberingPluginKey.getState(view.state);
              if (!map) return;

              const figures = view.dom.querySelectorAll(".drawio-figure__number");
              figures.forEach((el) => {
                const figureEl = el.closest(".drawio-figure");
                if (!figureEl) return;
                // Walk the ProseMirror doc to find the figure node at this DOM position
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

function updatePreview(preview: HTMLDivElement, node: ProseMirrorNode): void {
  const imgSrc = (node.attrs.svgUrl as string) || (node.attrs.imageUrl as string);
  const isError = node.attrs.figureStatus === "error";

  if (imgSrc) {
    preview.innerHTML = "";
    const img = document.createElement("img");
    img.src = imgSrc;
    img.alt = (node.attrs.caption as string) || "Figure";
    img.style.cssText = `max-width:100%;height:auto;border-radius:6px;${isError ? "opacity:0.5;" : ""}`;
    preview.appendChild(img);
  } else {
    preview.innerHTML = "";
    const placeholder = document.createElement("div");
    placeholder.classList.add("drawio-figure__placeholder");
    placeholder.style.cssText =
      "width:100%;height:200px;display:flex;align-items:center;justify-content:center;border:2px dashed #d4d4d8;border-radius:6px;color:#a1a1aa;font-size:14px;";
    placeholder.textContent = "Rendering figure...";
    preview.appendChild(placeholder);
  }
}

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
