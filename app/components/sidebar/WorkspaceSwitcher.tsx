import { useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import { Dropdown, DropdownItem } from "~/components/ui/Dropdown";
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
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const personalWorkspaces = workspaces.filter((ws) => ws.type === "personal");
  const teamWorkspaces = workspaces.filter((ws) => ws.type === "team");

  function handleCreate() {
    if (!newName.trim()) return;
    fetcher.submit(
      { intent: "create-workspace", name: newName.trim() },
      { method: "post", action: `/workspace/${currentWorkspaceId}` },
    );
    setNewName("");
    setCreateOpen(false);
  }

  // Navigate to new workspace after creation
  if (fetcher.data && (fetcher.data as { ok: boolean; workspaceId?: string }).workspaceId) {
    const wsId = (fetcher.data as { workspaceId: string }).workspaceId;
    // Use effect-free navigation: we navigate imperatively after the fetcher resolves
    if (fetcher.state === "idle") {
      navigate(`/workspace/${wsId}`);
    }
  }

  return (
    <>
      <Dropdown
        trigger={
          <div className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-zinc-900 hover:bg-zinc-100">
            <span className="truncate">{currentWorkspaceName}</span>
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
              className="shrink-0 text-zinc-400"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        }
        align="left"
      >
        {personalWorkspaces.length > 0 && (
          <>
            <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Personal
            </div>
            {personalWorkspaces.map((ws) => (
              <DropdownItem key={ws.id} onClick={() => navigate(`/workspace/${ws.id}`)}>
                <span className={ws.id === currentWorkspaceId ? "font-semibold" : ""}>
                  {ws.name}
                </span>
              </DropdownItem>
            ))}
          </>
        )}
        {teamWorkspaces.length > 0 && (
          <>
            <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Teams
            </div>
            {teamWorkspaces.map((ws) => (
              <DropdownItem key={ws.id} onClick={() => navigate(`/workspace/${ws.id}`)}>
                <span className={ws.id === currentWorkspaceId ? "font-semibold" : ""}>
                  {ws.name}
                </span>
              </DropdownItem>
            ))}
          </>
        )}
        <div className="my-1 border-t border-zinc-200" />
        <DropdownItem onClick={() => setCreateOpen(true)}>
          + New workspace
        </DropdownItem>
      </Dropdown>

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
