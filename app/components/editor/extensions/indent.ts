import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      increaseIndent: () => ReturnType;
      decreaseIndent: () => ReturnType;
      unsetIndent: () => ReturnType;
    };
  }
}

const MIN_INDENT = 0;
const MAX_INDENT = 8;

function clampIndent(value: number): number {
  return Math.min(MAX_INDENT, Math.max(MIN_INDENT, value));
}

export const Indent = Extension.create({
  name: "indent",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const dataIndent = element.getAttribute("data-indent");
              if (dataIndent) {
                return clampIndent(parseInt(dataIndent, 10) || 0);
              }
              const paddingLeft = element.style.paddingLeft;
              if (paddingLeft) {
                const emMatch = paddingLeft.match(/^([\d.]+)em$/);
                if (emMatch) {
                  return clampIndent(Math.round(parseFloat(emMatch[1]) / 2));
                }
              }
              return 0;
            },
            renderHTML: (attributes) => {
              const indent = attributes.indent as number;
              if (!indent || indent <= 0) {
                return {};
              }
              return {
                "data-indent": indent,
                style: `padding-left: ${indent * 2}em`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      increaseIndent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          let updated = false;

          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (node.type.name === "paragraph" || node.type.name === "heading") {
              const currentIndent = (node.attrs.indent as number) || 0;
              const newIndent = clampIndent(currentIndent + 1);
              if (newIndent !== currentIndent) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: newIndent,
                });
                updated = true;
              }
            }
          });

          if (updated && dispatch) {
            dispatch(tr);
          }
          return updated;
        },
      decreaseIndent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          let updated = false;

          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (node.type.name === "paragraph" || node.type.name === "heading") {
              const currentIndent = (node.attrs.indent as number) || 0;
              const newIndent = clampIndent(currentIndent - 1);
              if (newIndent !== currentIndent) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: newIndent,
                });
                updated = true;
              }
            }
          });

          if (updated && dispatch) {
            dispatch(tr);
          }
          return updated;
        },
      unsetIndent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          let updated = false;

          state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (node.type.name === "paragraph" || node.type.name === "heading") {
              const currentIndent = (node.attrs.indent as number) || 0;
              if (currentIndent !== 0) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: 0,
                });
                updated = true;
              }
            }
          });

          if (updated && dispatch) {
            dispatch(tr);
          }
          return updated;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.increaseIndent(),
      "Shift-Tab": () => this.editor.commands.decreaseIndent(),
    };
  },
});
