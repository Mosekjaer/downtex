import { Node, mergeAttributes } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";
import { Plugin } from "@tiptap/pm/state";
import { figureNumberingPluginKey } from "./figure";

export interface FigureReferenceAttributes {
  targetFigureId: string;
  targetCaption: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    figureReference: {
      insertFigureReference: (attrs: FigureReferenceAttributes) => ReturnType;
    };
  }
}

export const FigureReference = Node.create({
  name: "figureReference",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      targetFigureId: { default: null },
      targetCaption: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="figure-reference"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "figure-reference",
        "data-figure-id": node.attrs.targetFigureId,
        class:
          "text-accent-600 underline decoration-accent-300 hover:decoration-accent-600 cursor-pointer",
        title: node.attrs.targetCaption || "Figure reference",
      }),
      `Figur ?`,
    ];
  },

  addNodeView() {
    return ({ node, editor }) => {
      const span = document.createElement("span");
      span.dataset.type = "figure-reference";
      span.dataset.figureId = node.attrs.targetFigureId;
      span.className =
        "text-accent-600 underline decoration-accent-300 hover:decoration-accent-600 cursor-pointer";
      span.title = node.attrs.targetCaption || "Figure reference";
      span.contentEditable = "false";

      function updateDisplay() {
        const pluginState = figureNumberingPluginKey.getState(editor.state);
        const num = pluginState?.get(node.attrs.targetFigureId as string);
        span.textContent = num ? `Figur ${num}` : "Figur ?";
      }

      setTimeout(updateDisplay, 0);

      return {
        dom: span,
        update(updatedNode) {
          if (updatedNode.type.name !== "figureReference") return false;
          node = updatedNode;
          span.dataset.figureId = node.attrs.targetFigureId;
          span.title = node.attrs.targetCaption || "Figure reference";
          updateDisplay();
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      insertFigureReference:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        view() {
          return {
            update(view: EditorView) {
              const refs = view.dom.querySelectorAll('[data-type="figure-reference"]');
              const map = figureNumberingPluginKey.getState(view.state);
              if (!map) return;
              refs.forEach((el) => {
                const figId = (el as HTMLElement).dataset.figureId;
                if (!figId) return;
                const num = map.get(figId);
                el.textContent = num ? `Figur ${num}` : "Figur ?";
              });
            },
          };
        },
      }),
    ];
  },
});
