import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableCellBackground: {
      setCellBackground: (color: string) => ReturnType;
      unsetCellBackground: () => ReturnType;
    };
  }
}

export const TableCellBackground = Extension.create({
  name: "tableCellBackground",

  addGlobalAttributes() {
    return [
      {
        types: ["tableCell", "tableHeader"],
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element: HTMLElement) => {
              return element.style.backgroundColor || null;
            },
            renderHTML: (attributes: Record<string, unknown>) => {
              const value = attributes.backgroundColor as string | null;
              if (!value) {
                return {};
              }

              return {
                style: `background-color: ${value}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setCellBackground:
        (color: string) =>
        ({ commands }) => {
          return commands.setCellAttribute("backgroundColor", color);
        },
      unsetCellBackground:
        () =>
        ({ commands }) => {
          return commands.setCellAttribute("backgroundColor", null);
        },
    };
  },
});
