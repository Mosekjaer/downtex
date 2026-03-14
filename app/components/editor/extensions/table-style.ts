import { Extension } from "@tiptap/core";

export type TableStyleValue = "default" | "academic" | "striped" | "bordered" | "modern";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableStyle: {
      setTableStyle: (style: TableStyleValue) => ReturnType;
    };
  }
}

export const TableStyle = Extension.create({
  name: "tableStyle",

  addGlobalAttributes() {
    return [
      {
        types: ["table"],
        attributes: {
          tableStyle: {
            default: "default" as TableStyleValue,
            parseHTML: (element: HTMLElement) => {
              const dataAttr = element.getAttribute("data-table-style");
              if (dataAttr) {
                return dataAttr;
              }

              const classList = element.classList;
              const prefix = "table-style-";
              for (const cls of classList) {
                if (cls.startsWith(prefix)) {
                  return cls.slice(prefix.length);
                }
              }

              return "default";
            },
            renderHTML: (attributes: Record<string, unknown>) => {
              const value = attributes.tableStyle as string;
              if (!value || value === "default") {
                return {};
              }

              return {
                class: `table-style-${value}`,
                "data-table-style": value,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTableStyle:
        (style: TableStyleValue) =>
        ({ commands }) => {
          return commands.updateAttributes("table", { tableStyle: style });
        },
    };
  },
});
