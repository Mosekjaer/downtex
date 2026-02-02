import { useState, useRef, useEffect, useCallback } from "react";
import { useFetcher, useNavigate } from "react-router";
import { Modal } from "~/components/ui/Modal";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";

export interface WorkspaceInfo {
  id: string;
  name: string;
  avatarUrl: string | null;
  type: string;
  role: string;
}

export interface WorkspaceSwitcherProps {
  workspaces: WorkspaceInfo[];
  currentWorkspaceId: string;
  currentWorkspaceName: string;
}

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
  currentWorkspaceName,
}: WorkspaceSwitcherProps) {
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const personalWorkspaces = workspaces.filter((ws) => ws.type === "personal");
  const teamWorkspaces = workspaces.filter((ws) => ws.type === "team");

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) close();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, close]);

  function handleCreate() {
    if (!newName.trim()) return;
    fetcher.submit(
      { intent: "create-workspace", name: newName.trim() },
      { method: "post", action: `/workspace/${currentWorkspaceId}` },
    );
    setNewName("");
    setCreateOpen(false);
  }

  if (fetcher.data && (fetcher.data as { ok: boolean; workspaceId?: string }).workspaceId) {
    const wsId = (fetcher.data as { workspaceId: string }).workspaceId;
    if (fetcher.state === "idle") {
      navigate(`/workspace/${wsId}`);
    }
  }

  const initial = currentWorkspaceName.charAt(0).toUpperCase();

  return (
    <>
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-zinc-200/60"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-600 text-xs font-semibold text-white">
            {initial}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">
            {currentWorkspaceName}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
            {personalWorkspaces.length > 0 && (
              <div className="px-2 pb-1">
                <span className="block px-1.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Personal
                </span>
                {personalWorkspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      navigate(`/workspace/${ws.id}`);
                      close();
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                      ws.id === currentWorkspaceId
                        ? "bg-accent-50 font-medium text-accent-700"
                        : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-200 text-[10px] font-semibold text-zinc-600">
                      {ws.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{ws.name}</span>
                    {ws.id === currentWorkspaceId && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto shrink-0 text-accent-600">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}

            {teamWorkspaces.length > 0 && (
              <div className="px-2 pb-1">
                <span className="block px-1.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Teams
                </span>
                {teamWorkspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      navigate(`/workspace/${ws.id}`);
                      close();
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                      ws.id === currentWorkspaceId
                        ? "bg-accent-50 font-medium text-accent-700"
                        : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-200 text-[10px] font-semibold text-zinc-600">
                      {ws.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{ws.name}</span>
                    {ws.id === currentWorkspaceId && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto shrink-0 text-accent-600">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="mx-2 my-1 border-t border-zinc-100" />
            <div className="px-2 pb-1">
              <button
                onClick={() => {
                  close();
                  setCreateOpen(true);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New workspace
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create workspace">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
          className="flex flex-col gap-4"
        >
          <Input
            label="Workspace name"
            placeholder="My workspace"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!newName.trim()}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
