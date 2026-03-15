import { useSyncExternalStore, useCallback, useMemo } from "react";
import type { Doc as YDoc } from "yjs";
import type { ReferenceSource } from "~/lib/citation-formatters";

const REFERENCES_MAP = "references";

function readReferences(ydoc: YDoc): Record<string, ReferenceSource> {
  const map = ydoc.getMap(REFERENCES_MAP);
  const result: Record<string, ReferenceSource> = {};
  map.forEach((value, key) => {
    result[key] = value as ReferenceSource;
  });
  return result;
}

const EMPTY_REFS: Record<string, ReferenceSource> = {};

function createReferencesStore(ydoc: YDoc | null) {
  let snapshot: Record<string, ReferenceSource> = ydoc ? readReferences(ydoc) : EMPTY_REFS;

  return {
    getSnapshot: () => snapshot,
    subscribe: (onStoreChange: () => void) => {
      if (!ydoc) return () => {};
      const map = ydoc.getMap(REFERENCES_MAP);
      const observer = () => {
        snapshot = readReferences(ydoc);
        onStoreChange();
      };
      map.observe(observer);
      return () => {
        map.unobserve(observer);
      };
    },
  };
}

export function useReferences(ydoc: YDoc | null) {
  const store = useMemo(() => createReferencesStore(ydoc), [ydoc]);

  const references = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const addReference = useCallback(
    (source: ReferenceSource) => {
      if (!ydoc) return;
      const map = ydoc.getMap(REFERENCES_MAP);
      map.set(source.id, source);
    },
    [ydoc],
  );

  const updateReference = useCallback(
    (id: string, updates: Partial<ReferenceSource>) => {
      if (!ydoc) return;
      const map = ydoc.getMap(REFERENCES_MAP);
      const existing = map.get(id) as ReferenceSource | undefined;
      if (existing) {
        map.set(id, { ...existing, ...updates });
      }
    },
    [ydoc],
  );

  const deleteReference = useCallback(
    (id: string) => {
      if (!ydoc) return;
      const map = ydoc.getMap(REFERENCES_MAP);
      map.delete(id);
    },
    [ydoc],
  );

  const getReference = useCallback(
    (id: string): ReferenceSource | undefined => {
      return references[id];
    },
    [references],
  );

  return useMemo(
    () => ({ references, addReference, updateReference, deleteReference, getReference }),
    [references, addReference, updateReference, deleteReference, getReference],
  );
}
