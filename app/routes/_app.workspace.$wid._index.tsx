import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/supabase.server";

interface RecentDocument {
  id: string;
  title: string;
  updated_at: string;
  folder_id: string | null;
}

interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { supabase } = await requireAuth(request);
  const workspaceId = params.wid ?? "";

  const [foldersRes, docsRes] = await Promise.all([
    supabase
      .from("folders")
      .select("id, name, parent_folder_id")
      .eq("workspace_id", workspaceId)
      .is("parent_folder_id", null)
      .order("sort_order"),
    supabase
      .from("documents")
      .select("id, title, updated_at, folder_id")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(12),
  ]);

  return {
    workspaceId,
    folders: (foldersRes.data ?? []) as Folder[],
    recentDocuments: (docsRes.data ?? []) as RecentDocument[],
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

export default function WorkspaceIndex() {
  const { workspaceId, folders, recentDocuments } = useLoaderData<typeof loader>();

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-zinc-50/50">
      <div className="mx-auto w-full max-w-5xl px-8 py-10">
        {/* Recent documents */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Recent documents
          </h2>
          {recentDocuments.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recentDocuments.map((doc) => (
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
                  {/* Fake preview lines */}
                  <div className="space-y-1.5">
                    <div className="h-2 w-full rounded bg-zinc-100" />
                    <div className="h-2 w-4/5 rounded bg-zinc-100" />
                    <div className="h-2 w-3/5 rounded bg-zinc-100" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No documents yet. Create one from the sidebar.</p>
          )}
        </section>

        {/* Folders */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Folders
          </h2>
          {folders.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {folders.map((folder) => (
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
          ) : (
            <p className="text-sm text-zinc-500">No folders yet. Create one from the sidebar.</p>
          )}
        </section>
      </div>
    </div>
  );
}
