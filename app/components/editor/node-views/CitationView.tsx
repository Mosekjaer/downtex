import { useSyncExternalStore, useMemo, useCallback } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import type { Doc as YDoc } from "yjs";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { ReferenceSource, CitationStandard } from "~/lib/citation-formatters";
import { getFormatter, DEFAULT_SETTINGS } from "~/lib/citation-formatters";

const REFERENCES_MAP = "references";
const DOC_SETTINGS_MAP = "docSettings";

function getYDoc(editor: NodeViewProps["editor"]): YDoc | null {
  const collabExt = editor.extensionManager.extensions.find(
    (ext) => ext.name === "collaboration",
  );
  return (collabExt?.options?.document as YDoc) ?? null;
}

function computeCitationOrder(
  doc: ProseMirrorNode,
  sourceId: string,
): number {
  let order = 0;
  const seen = new Set<string>();
  let found = false;

  doc.descendants((node) => {
    if (found) return false;
    if (node.type.name === "citation") {
      const id = node.attrs.sourceId as string;
      if (!seen.has(id)) {
        seen.add(id);
        order++;
        if (id === sourceId) {
          found = true;
          return false;
        }
      }
    }
    return true;
  });

  return found ? order : 0;
}

interface ReferencesSnapshot {
  source: ReferenceSource | undefined;
  standard: CitationStandard;
}

function createReferencesStore(ydoc: YDoc | null, sourceId: string) {
  const readSnapshot = (): ReferencesSnapshot => {
    if (!ydoc) {
      return { source: undefined, standard: DEFAULT_SETTINGS.citationStandard };
    }
    const refsMap = ydoc.getMap(REFERENCES_MAP);
    const settingsMap = ydoc.getMap(DOC_SETTINGS_MAP);
    const source = refsMap.get(sourceId) as ReferenceSource | undefined;
    const standard =
      (settingsMap.get("citationStandard") as CitationStandard | undefined) ??
      DEFAULT_SETTINGS.citationStandard;
    return { source, standard };
  };

  let snapshot = readSnapshot();

  return {
    getSnapshot: () => snapshot,
    subscribe: (onStoreChange: () => void) => {
      if (!ydoc) return () => {};

      const refsMap = ydoc.getMap(REFERENCES_MAP);
      const settingsMap = ydoc.getMap(DOC_SETTINGS_MAP);

      const observer = () => {
        snapshot = readSnapshot();
        onStoreChange();
      };

      refsMap.observe(observer);
      settingsMap.observe(observer);

      return () => {
        refsMap.unobserve(observer);
        settingsMap.unobserve(observer);
      };
    },
  };
}

export function CitationView({ node, editor }: NodeViewProps) {
  const sourceId = node.attrs.sourceId as string;
  const ydoc = useMemo(() => getYDoc(editor), [editor]);

  const store = useMemo(
    () => createReferencesStore(ydoc, sourceId),
    [ydoc, sourceId],
  );

  const { source, standard } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  const displayText = useCallback(() => {
    if (!source) {
      return "[missing reference]";
    }
    const order = computeCitationOrder(editor.state.doc, sourceId);
    const formatter = getFormatter(standard);
    return formatter.formatInText(source, order);
  }, [source, standard, editor.state.doc, sourceId]);

  return (
    <NodeViewWrapper as="cite" className="citation">
      {displayText()}
    </NodeViewWrapper>
  );
}
