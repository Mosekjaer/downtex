import {
  Outlet,
  useLoaderData,
  useFetcher,
  Link,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "react-router";
import { useState, useCallback, useRef, useEffect } from "react";
import { requireAuth } from "~/lib/supabase.server";
import { getUserWorkspaceRole, requireRole } from "~/lib/permissions.server";
import { FolderTree } from "~/components/sidebar/FolderTree";
import { SearchBar } from "~/components/sidebar/SearchBar";
import { WorkspaceSwitcher } from "~/components/sidebar/WorkspaceSwitcher";

interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  sort_order: number;
}

interface Document {
  id: string;
  title: string;
  folder_id: string;
  updated_at: string;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { supabase, user } = await requireAuth(request);
  const workspaceId = params.wid ?? "";

  const role = await getUserWorkspaceRole(supabase, workspaceId, user.id);
  if (!role) {
    throw new Response("Not a member of this workspace", { status: 403 });
  }

  const [workspaceRes, foldersRes, documentsRes, allWorkspacesRes] = await Promise.all([
    supabase.from("workspaces").select("*").eq("id", workspaceId).single(),
    supabase
      .from("folders")
      .select("id, name, parent_folder_id, sort_order")
      .eq("workspace_id", workspaceId)
      .order("sort_order"),
    supabase
      .from("documents")
      .select("id, title, folder_id, updated_at")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("workspace_members")
      .select("workspace_id, role, workspaces(id, name, avatar_url, type)")
      .eq("user_id", user.id),
  ]);

  const workspaces = (allWorkspacesRes.data ?? []).map((wm) => {
    const ws = wm.workspaces as unknown as {
      id: string;
      name: string;
      avatar_url: string | null;
      type: string;
    };
    return {
      id: ws.id,
      name: ws.name,
      avatarUrl: ws.avatar_url,
      type: ws.type,
      role: wm.role,
    };
  });

  return {
    workspace: workspaceRes.data,
    folders: (foldersRes.data ?? []) as Folder[],
    documents: (documentsRes.data ?? []) as Document[],
    role,
    userId: user.id,
    workspaces,
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { supabase, user } = await requireAuth(request);
  const workspaceId = params.wid ?? "";
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  const role = await getUserWorkspaceRole(supabase, workspaceId, user.id);

  switch (intent) {
    case "create-folder": {
      requireRole(role, "editor");
      const name = formData.get("name") as string;
      const parentFolderId = formData.get("parentFolderId") as string | null;
      const { data } = await supabase
        .from("folders")
        .insert({
          workspace_id: workspaceId,
          name: name || "New Folder",
          parent_folder_id: parentFolderId || null,
          created_by: user.id,
        })
        .select("id")
        .single();
      return { ok: true, folderId: data?.id };
    }
    case "rename-folder": {
      requireRole(role, "editor");
      const folderId = formData.get("folderId") as string;
      const name = formData.get("name") as string;
      await supabase.from("folders").update({ name }).eq("id", folderId);
      return { ok: true };
    }
    case "delete-folder": {
      requireRole(role, "editor");
      const folderId = formData.get("folderId") as string;
      await supabase.from("folders").delete().eq("id", folderId);
      return { ok: true };
    }
    case "create-document": {
      requireRole(role, "editor");
      const folderId = formData.get("folderId") as string;
      const title = (formData.get("title") as string) || "Untitled";
      const { data } = await supabase
        .from("documents")
        .insert({
          folder_id: folderId,
          workspace_id: workspaceId,
          title,
          created_by: user.id,
        })
        .select("id")
        .single();
      return { ok: true, documentId: data?.id };
    }
    case "rename-document": {
      requireRole(role, "editor");
      const documentId = formData.get("documentId") as string;
      const title = formData.get("title") as string;
      await supabase.from("documents").update({ title }).eq("id", documentId);
      return { ok: true };
    }
    case "delete-document": {
      requireRole(role, "editor");
      const documentId = formData.get("documentId") as string;
      await supabase.from("documents").delete().eq("id", documentId);
      return { ok: true };
    }
    case "move-document": {
      requireRole(role, "editor");
      const documentId = formData.get("documentId") as string;
      const targetFolderId = formData.get("targetFolderId") as string;
      await supabase.from("documents").update({ folder_id: targetFolderId }).eq("id", documentId);
      return { ok: true };
    }
    case "create-folder-and-document": {
      requireRole(role, "editor");
      const folderName = (formData.get("folderName") as string) || "Documents";
      const docTitle = (formData.get("title") as string) || "Untitled";
      const { data: folder } = await supabase
        .from("folders")
        .insert({
          workspace_id: workspaceId,
          name: folderName,
          parent_folder_id: null,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (folder) {
        const { data: doc } = await supabase
          .from("documents")
          .insert({
            folder_id: folder.id,
            workspace_id: workspaceId,
            title: docTitle,
            created_by: user.id,
          })
          .select("id")
          .single();
        return { ok: true, folderId: folder.id, documentId: doc?.id };
      }
      return { ok: false, error: "Failed to create folder" };
    }
    case "create-workspace": {
      const name = formData.get("name") as string;
      const { data: ws } = await supabase
        .from("workspaces")
        .insert({ name, owner_id: user.id, type: "team" })
        .select("id")
        .single();
      if (ws) {
        await supabase
          .from("workspace_members")
          .insert({ workspace_id: ws.id, user_id: user.id, role: "owner" });
      }
      return { ok: true, workspaceId: ws?.id };
    }
    default:
      return { ok: false, error: "Unknown intent" };
  }
}

export default function WorkspaceLayout() {
  const { workspace, folders, documents, role, workspaces } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const isEditor = role === "owner" || role === "editor";
  const isOwner = role === "owner";

  const [searchQuery, setSearchQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewDocInput, setShowNewDocInput] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const newMenuRef = useRef<HTMLDivElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const newDocInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Close new menu on outside click
  useEffect(() => {
    if (!showNewMenu) return;
    const handler = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNewMenu]);

  // Focus inline inputs when shown
  useEffect(() => {
    if (showNewFolderInput) newFolderInputRef.current?.focus();
  }, [showNewFolderInput]);

  useEffect(() => {
    if (showNewDocInput) newDocInputRef.current?.focus();
  }, [showNewDocInput]);

  function handleCreateFolder() {
    setShowNewMenu(false);
    setShowNewFolderInput(true);
    setNewFolderName("");
  }

  const workspaceActionUrl = `/workspace/${workspace?.id}`;

  function submitNewFolder() {
    if (!newFolderName.trim()) {
      setShowNewFolderInput(false);
      return;
    }
    fetcher.submit(
      { intent: "create-folder", name: newFolderName.trim(), parentFolderId: "" },
      { method: "post", action: workspaceActionUrl },
    );
    setShowNewFolderInput(false);
    setNewFolderName("");
  }

  function handleCreateDocument() {
    setShowNewMenu(false);
    setShowNewDocInput(true);
    setNewDocTitle("");
  }

  function submitNewDocument() {
    if (!newDocTitle.trim()) {
      setShowNewDocInput(false);
      return;
    }
    if (folders.length > 0) {
      const rootFolder = folders.find((f) => f.parent_folder_id === null) ?? folders[0];
      fetcher.submit(
        { intent: "create-document", folderId: rootFolder.id, title: newDocTitle.trim() },
        { method: "post", action: workspaceActionUrl },
      );
    } else {
      fetcher.submit(
        {
          intent: "create-folder-and-document",
          folderName: "Documents",
          title: newDocTitle.trim(),
        },
        { method: "post", action: workspaceActionUrl },
      );
    }
    setShowNewDocInput(false);
    setNewDocTitle("");
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-zinc-200 bg-zinc-50/80 transition-all duration-200 ${
          collapsed ? "w-12" : "w-64"
        }`}
      >
        {/* Top: Workspace switcher + collapse toggle */}
        <div className="flex items-center border-b border-zinc-100 p-2">
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <WorkspaceSwitcher
                workspaces={workspaces}
                currentWorkspaceId={workspace?.id ?? ""}
                currentWorkspaceName={workspace?.name ?? ""}
              />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-200/60 hover:text-zinc-600 ${
              collapsed ? "mx-auto" : "ml-1"
            }`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {collapsed ? (
                <>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <polyline points="14 9 17 12 14 15" />
                </>
              ) : (
                <>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <polyline points="15 15 12 12 15 9" />
                </>
              )}
            </svg>
          </button>
        </div>

        {collapsed ? (
          /* Collapsed sidebar: icon-only actions */
          <div className="flex flex-col items-center gap-1 py-2">
            {isEditor && (
              <button
                onClick={() => {
                  setCollapsed(false);
                  setTimeout(() => setShowNewMenu(true), 200);
                }}
                className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-200/60 hover:text-zinc-600"
                title="New..."
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setCollapsed(false)}
              className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-200/60 hover:text-zinc-600"
              title="Search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            {isOwner && (
              <Link
                to={`/workspace/${workspace?.id}/settings`}
                className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-200/60 hover:text-zinc-600"
                title="Settings"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </Link>
            )}
          </div>
        ) : (
          /* Expanded sidebar */
          <>
            {/* Quick actions bar */}
            <div className="flex items-center gap-1 border-b border-zinc-100 px-2 py-1.5">
              {isEditor && (
                <div className="relative" ref={newMenuRef}>
                  <button
                    onClick={() => setShowNewMenu(!showNewMenu)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200/60 hover:text-zinc-900"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    New
                  </button>

                  {showNewMenu && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                      <button
                        onClick={handleCreateDocument}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-zinc-400"
                        >
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="12" y1="18" x2="12" y2="12" />
                          <line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                        New Page
                      </button>
                      <button
                        onClick={handleCreateFolder}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-zinc-400"
                        >
                          <path d="M12 10v6M9 13h6" />
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        New Folder
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex-1" />

              {isOwner && (
                <Link
                  to={`/workspace/${workspace?.id}/settings`}
                  className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-200/60 hover:text-zinc-600"
                  title="Workspace settings"
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
                  >
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </Link>
              )}
            </div>

            {/* Search */}
            <div className="px-2 pt-2">
              <SearchBar onSearch={handleSearch} />
            </div>

            {/* Section header */}
            <div className="px-3 pb-1 pt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Files
              </span>
            </div>

            {/* New folder inline input */}
            {showNewFolderInput && (
              <div className="mx-2 mb-1 flex items-center gap-1.5 rounded-md bg-white px-2 py-1 ring-1 ring-zinc-200">
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
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <input
                  ref={newFolderInputRef}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onBlur={submitNewFolder}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitNewFolder();
                    if (e.key === "Escape") setShowNewFolderInput(false);
                  }}
                  placeholder="Folder name..."
                  className="min-w-0 flex-1 bg-transparent py-0.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                />
              </div>
            )}

            {/* New document inline input */}
            {showNewDocInput && (
              <div className="mx-2 mb-1 flex items-center gap-1.5 rounded-md bg-white px-2 py-1 ring-1 ring-zinc-200">
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
                <input
                  ref={newDocInputRef}
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  onBlur={submitNewDocument}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitNewDocument();
                    if (e.key === "Escape") setShowNewDocInput(false);
                  }}
                  placeholder="Page title..."
                  className="min-w-0 flex-1 bg-transparent py-0.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                />
              </div>
            )}

            {/* Folder tree */}
            <div className="flex-1 overflow-y-auto px-1.5 pb-2">
              <FolderTree
                folders={folders}
                documents={documents}
                workspaceId={workspace?.id ?? ""}
                isEditor={isEditor}
                searchQuery={searchQuery}
                actionUrl={`/workspace/${workspace?.id}`}
              />

              {folders.length === 0 && !showNewFolderInput && (
                <div className="px-2 py-8 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-zinc-400"
                    >
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-500">No files yet</p>
                  {isEditor && (
                    <button
                      onClick={handleCreateFolder}
                      className="mt-2 text-sm font-medium text-accent-600 hover:text-accent-700"
                    >
                      Create your first folder
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom section */}
            <div className="border-t border-zinc-100 p-2">
              <Link
                to="/settings"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-200/60 hover:text-zinc-700"
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
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Settings
              </Link>
              <div className="mt-1 flex items-center gap-1.5 px-2 py-1">
                <img src="/favicon.svg" alt="" className="h-4 w-4 opacity-40" />
                <span className="text-[11px] font-medium text-zinc-300">downtex</span>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
