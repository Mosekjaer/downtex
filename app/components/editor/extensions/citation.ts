import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CitationView } from "../node-views/CitationView";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    citation: {
      insertCitation: (attrs: { sourceId: string }) => ReturnType;
    };
  }
}

export const Citation = Node.create({
  name: "citation",

  inline: true,
  group: "inline",
  atom: true,

  addAttributes() {
    return {
      sourceId: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-source-id") || "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "cite.citation[data-source-id]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "cite",
      { "data-source-id": HTMLAttributes.sourceId, class: "citation" },
      "",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CitationView);
  },

  addCommands() {
    return {
      insertCitation:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});
