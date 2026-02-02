import { useState, useMemo } from "react";
import { Modal } from "~/components/ui/Modal";

export type DocumentItem = {
  id: string;
  title: string;
  folderId: string;
  folderName?: string;
};

export type DocumentMentionPickerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (doc: DocumentItem) => void;
  documents: DocumentItem[];
};

export function DocumentMentionPicker({
  isOpen,
  onClose,
  onSelect,
  documents,
}: DocumentMentionPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return documents;
    const q = search.toLowerCase();
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.folderName?.toLowerCase().includes(q),
    );
  }, [search, documents]);

  function handleSelect(doc: DocumentItem) {
    onSelect(doc);
    setSearch("");
    onClose();
  }

  function handleClose() {
    setSearch("");
    onClose();
  }

  return (
    <Modal open={isOpen} onClose={handleClose} title="Insert document reference">
      <div className="space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          autoFocus
        />
        <div className="max-h-64 overflow-y-auto rounded-md border border-zinc-200">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-zinc-400">
              No documents found
            </div>
          ) : (
            filtered.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleSelect(doc)}
                className="flex w-full items-center gap-2.5 border-b border-zinc-100 px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-zinc-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 text-zinc-400"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-zinc-900">
                    {doc.title}
                  </div>
                  {doc.folderName && (
                    <div className="truncate text-xs text-zinc-400">
                      {doc.folderName}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
