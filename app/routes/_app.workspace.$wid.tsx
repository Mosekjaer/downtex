import {
  Outlet,
  useLoaderData,
  useFetcher,
  Link,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "react-router";
import { useState, useCallback } from "react";
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
  const workspaceId = params.wid!;

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
  const workspaceId = params.wid!;
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

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  function handleCreateFolder(parentId: string | null) {
    const name = prompt("Folder name:");
    if (!name) return;
    fetcher.submit(
      { intent: "create-folder", name, parentFolderId: parentId ?? "" },
      { method: "post" },
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-60 flex-shrink-0 overflow-y-auto border-r border-zinc-200 bg-zinc-50 p-2">
        {/* Workspace switcher */}
        <div className="mb-2 px-1">
          <WorkspaceSwitcher
            workspaces={workspaces}
            currentWorkspaceId={workspace?.id ?? ""}
            currentWorkspaceName={workspace?.name ?? ""}
          />
        </div>

        {/* Settings link for owners */}
        {isOwner && (
          <Link
            to={`/workspace/${workspace?.id}/settings`}
            className="mb-2 flex items-center gap-1.5 rounded-md px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
          >
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
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </Link>
        )}

        {/* Search */}
        <SearchBar onSearch={handleSearch} />

        {/* New root folder button */}
        <div className="mb-1 flex items-center justify-between px-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Files
          </span>
          {isEditor && (
            <button
              onClick={() => handleCreateFolder(null)}
              className="rounded p-0.5 text-xs text-zinc-400 hover:text-zinc-700"
              title="New root folder"
            >
              +
            </button>
          )}
        </div>

        {/* Folder tree */}
        <FolderTree
          folders={folders}
          documents={documents}
          workspaceId={workspace?.id ?? ""}
          isEditor={isEditor}
          searchQuery={searchQuery}
        />
      </div>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
