import { Outlet, type LoaderFunctionArgs } from "react-router";
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
      workspaces?.map((wm) => {
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
      }) ?? [],
  };
}

export default function AppLayout() {
  return (
    <div className="h-screen">
      <Outlet />
    </div>
  );
}
