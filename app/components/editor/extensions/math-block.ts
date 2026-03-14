import { Node, InputRule } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { MathBlockView } from "../node-views/MathBlockView";

export const MathBlock = Node.create({
  name: "mathBlock",

  group: "block",
  atom: true,
  defining: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-latex") || "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div.math-block[data-latex]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { class: "math-block", "data-latex": HTMLAttributes.latex }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockView);
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^\$\$$/,
        handler: ({ state, range }) => {
          const { tr } = state;
          const node = this.type.create({ latex: "" });

          tr.replaceWith(range.from, range.to, node);
        },
      }),
    ];
  },
});
