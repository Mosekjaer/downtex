import { useEffect, useRef, useState } from "react";
import {
  Link,
  useFetcher,
  useLoaderData,
  useNavigate,
  type LoaderFunctionArgs,
} from "react-router";
import { requireAuth } from "~/lib/supabase.server";

interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
}

interface Document {
  id: string;
  title: string;
  updated_at: string;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { supabase } = await requireAuth(request);
  const workspaceId = params.wid ?? "";
  const folderId = params.folderId ?? "";

  const [folderRes, allFoldersRes, subFoldersRes, docsRes] = await Promise.all([
    supabase.from("folders").select("id, name, parent_folder_id").eq("id", folderId).single(),
    supabase.from("folders").select("id, name, parent_folder_id").eq("workspace_id", workspaceId),
    supabase
      .from("folders")
      .select("id, name, parent_folder_id")
      .eq("workspace_id", workspaceId)
      .eq("parent_folder_id", folderId)
      .order("sort_order"),
    supabase
      .from("documents")
      .select("id, title, updated_at")
      .eq("folder_id", folderId)
      .order("updated_at", { ascending: false }),
  ]);

  if (!folderRes.data) {
    throw new Response("Folder not found", { status: 404 });
  }

  const allFolders = (allFoldersRes.data ?? []) as Folder[];
  const breadcrumbs: Folder[] = [];
  let current: Folder | undefined = folderRes.data as Folder;
  while (current) {
    breadcrumbs.unshift(current);
    current = allFolders.find((f) => f.id === current?.parent_folder_id);
  }

  return {
    workspaceId,
    folder: folderRes.data as Folder,
    breadcrumbs,
    subFolders: (subFoldersRes.data ?? []) as Folder[],
    documents: (docsRes.data ?? []) as Document[],
  };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function FolderView() {
  const { workspaceId, folder, breadcrumbs, subFolders, documents } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [creating, setCreating] = useState<"document" | "folder" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleCreate(type: "document" | "folder") {
    setCreating(type);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function submitCreate(name: string) {
    if (!name.trim()) {
      setCreating(null);
      return;
    }
    if (creating === "document") {
      fetcher.submit(
        { intent: "create-document", folderId: folder.id, title: name.trim() },
        { method: "post", action: `/workspace/${workspaceId}` },
      );
    } else {
      fetcher.submit(
        { intent: "create-folder", name: name.trim(), parentFolderId: folder.id },
        { method: "post", action: `/workspace/${workspaceId}` },
      );
    }
    setCreating(null);
  }

  // Navigate to newly created document
  const fetcherData = fetcher.data as { ok?: boolean; documentId?: string } | undefined;
  useEffect(() => {
    if (fetcherData?.ok && fetcherData.documentId) {
      navigate(`/workspace/${workspaceId}/${fetcherData.documentId}`);
    }
  }, [fetcherData, navigate, workspaceId]);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-zinc-50/50">
      <div className="mx-auto w-full max-w-5xl px-8 py-10">
        {/* Header with breadcrumbs and action buttons */}
        <div className="mb-6 flex items-center justify-between">
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to={`/workspace/${workspaceId}`}
              className="text-zinc-400 transition-colors hover:text-zinc-700"
            >
              Home
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1">
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
                  className="text-zinc-300"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {i === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-zinc-700">{crumb.name}</span>
                ) : (
                  <Link
                    to={`/workspace/${workspaceId}/folder/${crumb.id}`}
                    className="text-zinc-400 transition-colors hover:text-zinc-700"
                  >
                    {crumb.name}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCreate("document")}
              className="flex items-center gap-1.5 rounded-md bg-accent-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-600"
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
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              New Page
            </button>
            <button
              type="button"
              onClick={() => handleCreate("folder")}
              className="flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
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
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
              New Folder
            </button>
          </div>
        </div>

        {/* Inline creation input */}
        {creating && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-accent-200 bg-accent-50/50 px-4 py-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-accent-500"
            >
              {creating === "folder" ? (
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              ) : (
                <>
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </>
              )}
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder={creating === "document" ? "Document name..." : "Folder name..."}
              className="flex-1 bg-transparent text-sm text-zinc-700 outline-none placeholder:text-zinc-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCreate(e.currentTarget.value);
                if (e.key === "Escape") setCreating(null);
              }}
              onBlur={(e) => submitCreate(e.currentTarget.value)}
            />
            <span className="text-xs text-zinc-400">Enter to create, Esc to cancel</span>
          </div>
        )}

        {/* Subfolders */}
        {subFolders.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Folders
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {subFolders.map((folder) => (
                <Link
                  key={folder.id}
                  to={`/workspace/${workspaceId}/folder/${folder.id}`}
                  className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-all hover:border-zinc-300 hover:shadow-sm"
                >
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
                    className="shrink-0 text-zinc-400 group-hover:text-accent-500"
                  >
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <span className="truncate text-sm font-medium text-zinc-700 group-hover:text-accent-700">
                    {folder.name}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Documents */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Documents
          </h2>
          {documents.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/workspace/${workspaceId}/${doc.id}`}
                  className="group rounded-lg border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-50">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-accent-500"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 group-hover:text-accent-700">
                        {doc.title}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-400">{formatDate(doc.updated_at)}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2 w-full rounded bg-zinc-100" />
                    <div className="h-2 w-4/5 rounded bg-zinc-100" />
                    <div className="h-2 w-3/5 rounded bg-zinc-100" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 py-12 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto mb-3 text-zinc-300"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-sm text-zinc-500">This folder is empty</p>
              <button
                type="button"
                onClick={() => handleCreate("document")}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-600"
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
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Page
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
