import { useState, useEffect, useCallback } from "react";
import { Modal } from "~/components/ui/Modal";
import { Button } from "~/components/ui/Button";

export type ConnectedRepo = {
  id: string;
  githubRepo: string;
  displayName: string;
};

type TreeItem = {
  name: string;
  type: "file" | "dir";
  path: string;
  sha: string;
};

export type FigurePickerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (repo: string, path: string, fileType: string, workspaceRepositoryId?: string) => void;
  connectedRepos?: ConnectedRepo[];
};

/**
 * Parse a GitHub blob URL into owner/repo and file path.
 */
function parseGitHubUrl(raw: string): { repo: string; path: string } | null {
  try {
    const url = new URL(raw.trim());
    if (url.hostname !== "github.com") return null;

    const parts = url.pathname.replace(/^\//, "").split("/");
    if (parts.length < 5) return null;

    const [owner, repo, blobOrTree, , ...rest] = parts;
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

function getFileType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "drawio") return "drawio";
  if (["png", "jpg", "jpeg", "gif", "svg"].includes(ext)) return ext;
  return "drawio";
}

type Tab = "paste" | "browse";

export function FigurePicker({
  isOpen,
  onClose,
  onSelect,
  connectedRepos = [],
}: FigurePickerProps) {
  const [activeTab, setActiveTab] = useState<Tab>("paste");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Browse state
  const [selectedRepo, setSelectedRepo] = useState<ConnectedRepo | null>(null);
  const [currentPath, setCurrentPath] = useState<string | undefined>(undefined);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [treeItems, setTreeItems] = useState<TreeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);

  // Reset browse state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedRepo(null);
      setCurrentPath(undefined);
      setPathHistory([]);
      setTreeItems([]);
      setBrowseError(null);
    }
  }, [isOpen]);

  const fetchTree = useCallback(async (repoId: string, path?: string) => {
    setLoading(true);
    setBrowseError(null);
    try {
      const params = path ? `?path=${encodeURIComponent(path)}` : "";
      const res = await fetch(`/api/github-tree/${repoId}${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed to load files" }));
        setBrowseError(body.error ?? "Failed to load files");
        setTreeItems([]);
        return;
      }
      const data = (await res.json()) as { items: TreeItem[] };
      setTreeItems(data.items);
    } catch {
      setBrowseError("Network error loading repository files");
      setTreeItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSelectRepo(repo: ConnectedRepo) {
    setSelectedRepo(repo);
    setCurrentPath(undefined);
    setPathHistory([]);
    fetchTree(repo.id);
  }

  function handleNavigateDir(item: TreeItem) {
    if (!selectedRepo) return;
    setPathHistory((prev) => [...prev, currentPath ?? ""]);
    setCurrentPath(item.path);
    fetchTree(selectedRepo.id, item.path);
  }

  function handleGoBack() {
    if (!selectedRepo) return;
    if (pathHistory.length === 0) {
      // Go back to repo list
      setSelectedRepo(null);
      setTreeItems([]);
      return;
    }
    const prev = pathHistory[pathHistory.length - 1];
    setPathHistory((h) => h.slice(0, -1));
    const newPath = prev || undefined;
    setCurrentPath(newPath);
    fetchTree(selectedRepo.id, newPath);
  }

  function handleSelectFile(item: TreeItem) {
    if (!selectedRepo) return;
    const fileType = getFileType(item.name);
    onSelect(selectedRepo.githubRepo, item.path, fileType, selectedRepo.id);
    onClose();
  }

  function handleSubmit() {
    setError(null);
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      setError(
        "Invalid GitHub URL. Expected format: https://github.com/owner/repo/blob/branch/path/to/file.drawio",
      );
      return;
    }
    const fileType = getFileType(parsed.path);
    onSelect(parsed.repo, parsed.path, fileType);
    setUrl("");
    setError(null);
    onClose();
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Insert figure">
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
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
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
          <div className="min-h-[280px]">
            {connectedRepos.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-zinc-300 py-10">
                <p className="text-sm text-zinc-400">
                  No repositories connected to this workspace.
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Connect a repository in workspace settings first.
                </p>
              </div>
            ) : !selectedRepo ? (
              <div className="space-y-1">
                <p className="mb-2 text-xs font-medium text-zinc-500">Select a repository</p>
                {connectedRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => handleSelectRepo(repo)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-50"
                  >
                    <svg
                      className="h-4 w-4 flex-shrink-0 text-zinc-400"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
                    </svg>
                    <div>
                      <div className="font-medium text-zinc-900">{repo.displayName}</div>
                      <div className="text-xs text-zinc-400">{repo.githubRepo}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Breadcrumb / back */}
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  <button onClick={handleGoBack} className="hover:text-accent-600">
                    &larr; Back
                  </button>
                  <span className="mx-1">/</span>
                  <span className="font-medium text-zinc-700">{selectedRepo.displayName}</span>
                  {currentPath && (
                    <>
                      <span className="mx-1">/</span>
                      <span className="truncate text-zinc-600">{currentPath}</span>
                    </>
                  )}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <span className="text-sm text-zinc-400">Loading...</span>
                  </div>
                ) : browseError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {browseError}
                  </div>
                ) : treeItems.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <p className="text-sm text-zinc-400">No supported files in this directory.</p>
                  </div>
                ) : (
                  <div className="max-h-[240px] overflow-y-auto rounded-md border border-zinc-200">
                    {treeItems.map((item) => (
                      <button
                        key={item.path}
                        onClick={() =>
                          item.type === "dir" ? handleNavigateDir(item) : handleSelectFile(item)
                        }
                        className="flex w-full items-center gap-2 border-b border-zinc-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-zinc-50"
                      >
                        {item.type === "dir" ? (
                          <svg
                            className="h-4 w-4 flex-shrink-0 text-amber-500"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                          >
                            <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z" />
                          </svg>
                        ) : (
                          <svg
                            className="h-4 w-4 flex-shrink-0 text-zinc-400"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                          >
                            <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z" />
                          </svg>
                        )}
                        <span className="truncate">{item.name}</span>
                        {item.type === "dir" && (
                          <svg
                            className="ml-auto h-3 w-3 flex-shrink-0 text-zinc-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
