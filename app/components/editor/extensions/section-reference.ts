import { Node, mergeAttributes } from "@tiptap/core";

export interface SectionReferenceAttributes {
  targetDocumentId: string;
  targetDocumentTitle: string;
  targetHeadingId: string;
  targetHeadingText: string;
  sectionNumber: string;
  workspaceId: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    sectionReference: {
      insertSectionReference: (attrs: SectionReferenceAttributes) => ReturnType;
    };
  }
}

export const SectionReference = Node.create({
  name: "sectionReference",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      targetDocumentId: { default: null },
      targetDocumentTitle: { default: "" },
      targetHeadingId: { default: null },
      targetHeadingText: { default: "" },
      sectionNumber: { default: "" },
      workspaceId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-type="section-reference"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const displayText = node.attrs.sectionNumber
      ? `Section ${node.attrs.sectionNumber}`
      : node.attrs.targetHeadingText || "Section ?";

    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-type": "section-reference",
        "data-target-document-id": node.attrs.targetDocumentId,
        "data-target-heading-id": node.attrs.targetHeadingId,
        href: `/workspace/${node.attrs.workspaceId}/${node.attrs.targetDocumentId}#${node.attrs.targetHeadingId}`,
        class: "text-accent-600 underline decoration-accent-300 hover:decoration-accent-600 cursor-pointer",
        title: `${node.attrs.targetDocumentTitle} — ${node.attrs.targetHeadingText}`,
      }),
      displayText,
    ];
  },

  addCommands() {
    return {
      insertSectionReference:
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
