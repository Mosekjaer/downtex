import { useSyncExternalStore, useCallback, useMemo } from "react";
import type { Doc as YDoc } from "yjs";
import type { DocumentLayoutSettings } from "~/lib/citation-formatters";
import { DEFAULT_SETTINGS } from "~/lib/citation-formatters";

const DOC_SETTINGS_MAP = "docSettings";

function readSettings(ydoc: YDoc): DocumentLayoutSettings {
  const map = ydoc.getMap(DOC_SETTINGS_MAP);
  const result = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof DocumentLayoutSettings)[]) {
    const val = map.get(key);
    if (val !== undefined) {
      (result as Record<string, unknown>)[key] = val;
    }
  }
  return result;
}

// Stable snapshot reference: only changes when the Y.Map content changes
function createSettingsStore(ydoc: YDoc | null) {
  let snapshot = ydoc ? readSettings(ydoc) : DEFAULT_SETTINGS;

  return {
    getSnapshot: () => snapshot,
    subscribe: (onStoreChange: () => void) => {
      if (!ydoc) return () => {};
      const map = ydoc.getMap(DOC_SETTINGS_MAP);
      const observer = () => {
        snapshot = readSettings(ydoc);
        onStoreChange();
      };
      map.observe(observer);
      return () => {
        map.unobserve(observer);
      };
    },
  };
}

export function useDocSettings(ydoc: YDoc | null) {
  const store = useMemo(() => createSettingsStore(ydoc), [ydoc]);

  const settings = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const updateSetting = useCallback(
    <K extends keyof DocumentLayoutSettings>(key: K, value: DocumentLayoutSettings[K]) => {
      if (!ydoc) return;
      const map = ydoc.getMap(DOC_SETTINGS_MAP);
      map.set(key, value);
    },
    [ydoc],
  );

  const updateSettings = useCallback(
    (partial: Partial<DocumentLayoutSettings>) => {
      if (!ydoc) return;
      const map = ydoc.getMap(DOC_SETTINGS_MAP);
      ydoc.transact(() => {
        for (const [key, value] of Object.entries(partial)) {
          map.set(key, value);
        }
      });
    },
    [ydoc],
  );

  return useMemo(
    () => ({ settings, updateSetting, updateSettings }),
    [settings, updateSetting, updateSettings],
  );
}
