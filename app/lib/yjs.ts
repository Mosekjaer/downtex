import * as Y from "yjs";

export function createYjsDoc(): Y.Doc {
  return new Y.Doc();
}

export function initializeFromBase64(doc: Y.Doc, base64State: string): void {
  const binary = Uint8Array.from(atob(base64State), (c) => c.charCodeAt(0));
  Y.applyUpdate(doc, binary);
}

export function exportToBase64(doc: Y.Doc): string {
  const state = Y.encodeStateAsUpdate(doc);
  let binary = "";
  for (let i = 0; i < state.length; i++) {
    binary += String.fromCharCode(state[i]);
  }
  return btoa(binary);
}
