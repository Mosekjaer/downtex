import { Outlet, type LoaderFunctionArgs, useLoaderData } from "react-router";
import { requireAuth } from "~/lib/supabase.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, user } = await requireAuth(request);

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const { data: workspaces } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(id, name, avatar_url, type)")
    .eq("user_id", user.id);

  return {
    user: {
      id: user.id,
      displayName: profile?.display_name ?? "User",
      avatarUrl: profile?.avatar_url ?? null,
    },
    workspaces:
      workspaces?.map((wm) => ({
        id: (wm.workspaces as { id: string }).id,
        name: (wm.workspaces as { name: string }).name,
        avatarUrl: (wm.workspaces as { avatar_url: string | null }).avatar_url,
        type: (wm.workspaces as { type: string }).type,
        role: wm.role,
      })) ?? [],
  };
}

export default function AppLayout() {
  const { user, workspaces } = useLoaderData<typeof loader>();

  return (
    <div className="flex h-screen">
      <aside className="flex w-60 flex-col border-r border-zinc-200 bg-zinc-50">
        <div className="border-b border-zinc-200 p-3">
          <p className="text-sm font-semibold text-zinc-900">{user.displayName}</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {workspaces.map((ws) => (
            <a
              key={ws.id}
              href={`/workspace/${ws.id}`}
              className="block rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              {ws.name}
            </a>
          ))}
        </nav>
        <div className="border-t border-zinc-200 p-2">
          <a
            href="/settings"
            className="block rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Settings
          </a>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
