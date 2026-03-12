import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface DocumentMentionAttributes {
  documentId: string;
  documentTitle: string;
  workspaceId: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    documentMention: {
      insertDocumentMention: (attrs: DocumentMentionAttributes) => ReturnType;
    };
  }
}

export const DocumentMention = Node.create({
  name: "documentMention",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      documentId: { default: null },
      documentTitle: { default: "" },
      workspaceId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-type="document-mention"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-type": "document-mention",
        "data-document-id": node.attrs.documentId,
        href: `/workspace/${node.attrs.workspaceId}/${node.attrs.documentId}`,
        class: "text-accent-600 underline decoration-accent-300 hover:decoration-accent-600 cursor-pointer",
      }),
      node.attrs.documentTitle,
    ];
  },

  addCommands() {
    return {
      insertDocumentMention:
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
    const pluginKey = new PluginKey("documentMentionClick");
    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;
            const link = target.closest('a[data-type="document-mention"]');
            if (link) {
              const href = link.getAttribute("href");
              if (href) {
                window.location.href = href;
                return true;
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});
