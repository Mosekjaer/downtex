import { useState } from "react";
import { Dropdown, DropdownItem } from "~/components/ui/Dropdown";

interface DocumentSettingsProps {
  role: string;
  onShare: () => void;
  onVersionHistory: () => void;
  onDelete: () => void;
}

export function DocumentSettings({
  role,
  onShare,
  onVersionHistory,
  onDelete,
}: DocumentSettingsProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isOwner = role === "owner";

  return (
    <Dropdown
      trigger={
        <button
          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-1"
          aria-label="Document settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      }
      align="right"
    >
      <DropdownItem onClick={onShare}>Share...</DropdownItem>
      <DropdownItem onClick={onVersionHistory}>Version history</DropdownItem>

      {isOwner && (
        <>
          <div className="my-1 border-t border-zinc-200" role="separator" />
          {confirmingDelete ? (
            <div className="px-3 py-2">
              <p className="text-xs text-red-600 font-medium">
                Are you sure? This cannot be undone.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                  onClick={() => {
                    setConfirmingDelete(false);
                    onDelete();
                  }}
                >
                  Delete
                </button>
                <button
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <DropdownItem onClick={() => setConfirmingDelete(true)}>
              <span className="text-red-600">Delete document</span>
            </DropdownItem>
          )}
        </>
      )}
    </Dropdown>
  );
}
