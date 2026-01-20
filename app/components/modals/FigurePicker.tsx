import { useState } from "react";
import { Modal } from "~/components/ui/Modal";
import { Button } from "~/components/ui/Button";

export type FigurePickerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (repo: string, path: string) => void;
};

/**
 * Parse a GitHub blob URL into owner/repo and file path.
 *
 * Accepted format:
 *   https://github.com/owner/repo/blob/main/path/to/file.drawio
 *   https://github.com/owner/repo/blob/some-branch/dir/file.drawio.svg
 *
 * Returns null if the URL cannot be parsed.
 */
function parseGitHubUrl(
  raw: string,
): { repo: string; path: string } | null {
  try {
    const url = new URL(raw.trim());
    if (url.hostname !== "github.com") return null;

    // pathname: /owner/repo/blob/branch/rest/of/path
    const parts = url.pathname.replace(/^\//, "").split("/");
    if (parts.length < 5) return null;

    const [owner, repo, blobOrTree, _branch, ...rest] = parts;
    if (blobOrTree !== "blob" && blobOrTree !== "tree") return null;
    if (!rest.length) return null;

    return {
      repo: `${owner}/${repo}`,
      path: rest.join("/"),
    };
  } catch {
    return null;
  }
}

type Tab = "paste" | "browse";

export function FigurePicker({ isOpen, onClose, onSelect }: FigurePickerProps) {
  const [activeTab, setActiveTab] = useState<Tab>("paste");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      setError(
        "Invalid GitHub URL. Expected format: https://github.com/owner/repo/blob/branch/path/to/file.drawio",
      );
      return;
    }
    onSelect(parsed.repo, parsed.path);
    setUrl("");
    setError(null);
    onClose();
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Insert Draw.io figure">
      <div className="space-y-4">
        {/* Tab bar */}
        <div className="flex gap-1 rounded-md bg-zinc-100 p-0.5">
          <button
            onClick={() => setActiveTab("paste")}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "paste"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Paste URL
          </button>
          <button
            onClick={() => setActiveTab("browse")}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "browse"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Browse repos
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "paste" && (
          <div className="space-y-3">
            <div>
              <label
                htmlFor="github-url"
                className="mb-1.5 block text-sm font-medium text-zinc-700"
              >
                GitHub URL
              </label>
              <input
                id="github-url"
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="https://github.com/owner/repo/blob/main/diagrams/arch.drawio"
                className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
              {error && (
                <p className="mt-1 text-xs text-red-600">{error}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={!url.trim()}>
                Insert
              </Button>
            </div>
          </div>
        )}

        {activeTab === "browse" && (
          <div className="flex items-center justify-center rounded-md border border-dashed border-zinc-300 py-10">
            <p className="text-sm text-zinc-400">
              Repository browsing will be available in a future release. Use the
              "Paste URL" tab for now.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
