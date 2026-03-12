import { useState } from "react";
import { useFetcher } from "react-router";
import { Modal } from "~/components/ui/Modal";
import { Button } from "~/components/ui/Button";

export type Snapshot = {
  id: string;
  label: string;
  type: "manual" | "automatic";
  created_at: string;
  created_by_name: string;
};

export type VersionHistoryProps = {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  snapshots: Snapshot[];
};

function VersionHistory({ isOpen, onClose, documentId, snapshots }: VersionHistoryProps) {
  const fetcher = useFetcher();
  const [previewSnapshot, setPreviewSnapshot] = useState<Snapshot | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  const sortedSnapshots = [...snapshots].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  function handleRestore(snapshotId: string) {
    fetcher.submit(
      { intent: "restore-snapshot", snapshotId },
      { method: "post" },
    );
    setConfirmRestoreId(null);
    onClose();
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Version History">
      <div className="flex gap-4">
        {/* Snapshot list */}
        <div className={`flex-1 ${previewSnapshot ? "max-w-[50%]" : ""}`}>
          {sortedSnapshots.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No snapshots yet. Create one to save a version of this document.
            </p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {sortedSnapshots.map((snap) => (
                <li
                  key={snap.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    previewSnapshot?.id === snap.id
                      ? "border-accent-500 bg-accent-50"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {snap.label}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            snap.type === "manual"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {snap.type === "manual" ? "Manual" : "Auto"}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {formatDate(snap.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-400">
                        by {snap.created_by_name}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPreviewSnapshot(
                            previewSnapshot?.id === snap.id ? null : snap,
                          )
                        }
                      >
                        Preview
                      </Button>
                      {confirmRestoreId === snap.id ? (
                        <div className="flex gap-1">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRestore(snap.id)}
                            disabled={fetcher.state !== "idle"}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmRestoreId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setConfirmRestoreId(snap.id)}
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Preview panel (T081) */}
        {previewSnapshot && (
          <div className="w-1/2 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900">
                Snapshot Preview
              </h3>
              <button
                onClick={() => setPreviewSnapshot(null)}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                Close
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium text-zinc-600">Label</dt>
                <dd className="text-zinc-900">{previewSnapshot.label}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-600">Type</dt>
                <dd className="capitalize text-zinc-900">
                  {previewSnapshot.type}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-600">Created at</dt>
                <dd className="text-zinc-900">
                  {formatDate(previewSnapshot.created_at)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-600">Created by</dt>
                <dd className="text-zinc-900">
                  {previewSnapshot.created_by_name}
                </dd>
              </div>
            </dl>
            <p className="mt-4 rounded border border-zinc-200 bg-white p-3 text-xs text-zinc-500">
              Full document preview is not yet available. Restoring this
              snapshot will replace the current document content with the saved
              Yjs state from this point in time.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export { VersionHistory };
