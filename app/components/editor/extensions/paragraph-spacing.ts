import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraphSpacing: {
      setParagraphSpacing: (spacing: {
        top?: string | null;
        bottom?: string | null;
      }) => ReturnType;
      unsetParagraphSpacing: () => ReturnType;
    };
  }
}

export const ParagraphSpacing = Extension.create({
  name: "paragraphSpacing",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          marginTop: {
            default: null,
            parseHTML: (element) => element.style.marginTop || null,
            renderHTML: (attributes) => {
              if (!attributes.marginTop) {
                return {};
              }
              return { style: `margin-top: ${attributes.marginTop}` };
            },
          },
          marginBottom: {
            default: null,
            parseHTML: (element) => element.style.marginBottom || null,
            renderHTML: (attributes) => {
              if (!attributes.marginBottom) {
                return {};
              }
              return { style: `margin-bottom: ${attributes.marginBottom}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphSpacing:
        ({ top, bottom }) =>
        ({ commands }) => {
          const attrs: Record<string, string | null> = {};
          if (top !== undefined) {
            attrs.marginTop = top;
          }
          if (bottom !== undefined) {
            attrs.marginBottom = bottom;
          }
          return commands.updateAttributes("paragraph", attrs);
        },
      unsetParagraphSpacing:
        () =>
        ({ commands }) => {
          return commands.updateAttributes("paragraph", {
            marginTop: null,
            marginBottom: null,
          });
        },
    };
  },
});
