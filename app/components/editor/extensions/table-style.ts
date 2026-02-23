import { Extension, findParentNode } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export type TableStyleValue = "default" | "minimal" | "elegant" | "striped" | "research";

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
        ({ state, dispatch }) => {
          const tableNode = findParentNode((node) => node.type.name === "table")(state.selection);
          if (!tableNode) return false;

          if (dispatch) {
            const { tr } = state;
            tr.setNodeMarkup(tableNode.pos, undefined, {
              ...tableNode.node.attrs,
              tableStyle: style,
            });
            dispatch(tr);
          }

          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey("tableStyleSync");

    return [
      new Plugin({
        key: pluginKey,
        view: () => ({
          update: (view) => {
            view.state.doc.descendants((node, pos) => {
              if (node.type.name === "table") {
                const dom = view.nodeDOM(pos);
                if (dom instanceof HTMLElement) {
                  const tableEl = dom.tagName === "TABLE" ? dom : dom.querySelector("table");
                  if (tableEl) {
                    const style = (node.attrs.tableStyle as string) || "default";
                    for (const cls of [...tableEl.classList]) {
                      if (cls.startsWith("table-style-")) tableEl.classList.remove(cls);
                    }
                    if (style !== "default") {
                      tableEl.classList.add(`table-style-${style}`);
                    }
                  }
                }
              }
            });
          },
        }),
      }),
    ];
  },
});
