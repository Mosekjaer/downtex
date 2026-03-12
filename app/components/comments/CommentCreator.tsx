import { useState } from "react";
import { useFetcher } from "react-router";

interface CommentCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  anchorTextPreview: string;
  anchorData: string;
}

export function CommentCreator({
  isOpen,
  onClose,
  anchorTextPreview,
  anchorData,
}: CommentCreatorProps) {
  const fetcher = useFetcher();
  const [body, setBody] = useState("");

  if (!isOpen) return null;

  function handleSubmit() {
    if (!body.trim()) return;
    fetcher.submit(
      {
        intent: "create-comment",
        body,
        anchorTextPreview,
        anchorData,
      },
      { method: "post" },
    );
    setBody("");
    onClose();
  }

  return (
    <div className="border-b border-zinc-200 bg-amber-50 px-3 py-3">
      <div className="mb-2 truncate text-xs text-amber-700">
        Commenting on: &ldquo;{anchorTextPreview}&rdquo;
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a comment..."
        rows={3}
        className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        autoFocus
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded px-3 py-1 text-xs text-zinc-500 hover:text-zinc-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!body.trim()}
          className="rounded-md bg-accent-600 px-3 py-1 text-xs font-medium text-white hover:bg-accent-700 disabled:opacity-40"
        >
          Comment
        </button>
      </div>
    </div>
  );
}
