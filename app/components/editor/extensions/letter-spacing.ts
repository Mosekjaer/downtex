import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    letterSpacing: {
      setLetterSpacing: (value: string) => ReturnType;
      unsetLetterSpacing: () => ReturnType;
    };
  }
}

export const LetterSpacing = Extension.create({
  name: "letterSpacing",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: (element) => element.style.letterSpacing || null,
            renderHTML: (attributes) => {
              if (!attributes.letterSpacing) {
                return {};
              }
              return { style: `letter-spacing: ${attributes.letterSpacing}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLetterSpacing:
        (value: string) =>
        ({ commands }) => {
          return commands.setMark("textStyle", { letterSpacing: value });
        },
      unsetLetterSpacing:
        () =>
        ({ commands }) => {
          return commands.setMark("textStyle", { letterSpacing: null });
        },
    };
  },
});
