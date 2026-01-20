import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

interface CursorUser {
  displayName: string;
  cursorColor: string;
}

const cursorPluginKey = new PluginKey("remoteCursors");

export function createCursorPlugin(getUsers: () => Map<string, CursorUser & { from: number; to: number }>) {
  return new Plugin({
    key: cursorPluginKey,
    state: {
      init() {
        return DecorationSet.empty;
      },
      apply(_tr, _old, _oldState, newState) {
        const users = getUsers();
        const decorations: Decoration[] = [];

        users.forEach((user) => {
          if (user.from === user.to) {
            const cursorEl = document.createElement("span");
            cursorEl.className = "remote-cursor";
            cursorEl.style.borderLeft = `2px solid ${user.cursorColor}`;
            cursorEl.style.marginLeft = "-1px";
            cursorEl.style.position = "relative";

            const labelEl = document.createElement("span");
            labelEl.className = "remote-cursor-label";
            labelEl.style.position = "absolute";
            labelEl.style.top = "-1.4em";
            labelEl.style.left = "-1px";
            labelEl.style.fontSize = "10px";
            labelEl.style.lineHeight = "1";
            labelEl.style.padding = "1px 4px";
            labelEl.style.borderRadius = "3px";
            labelEl.style.color = "white";
            labelEl.style.backgroundColor = user.cursorColor;
            labelEl.style.whiteSpace = "nowrap";
            labelEl.style.pointerEvents = "none";
            labelEl.textContent = user.displayName;

            cursorEl.appendChild(labelEl);

            decorations.push(
              Decoration.widget(user.from, cursorEl, { side: 1 }),
            );
          } else {
            decorations.push(
              Decoration.inline(user.from, Math.min(user.to, newState.doc.content.size), {
                style: `background-color: ${user.cursorColor}20;`,
              }),
            );
          }
        });

        return DecorationSet.create(newState.doc, decorations);
      },
    },
    props: {
      decorations(state) {
        return cursorPluginKey.getState(state);
      },
    },
  });
}

export const RemoteCursorsExtension = Extension.create({
  name: "remoteCursors",

  addOptions() {
    return {
      getUsers: () => new Map() as Map<string, CursorUser & { from: number; to: number }>,
    };
  },

  addProseMirrorPlugins() {
    return [createCursorPlugin(this.options.getUsers)];
  },
});
