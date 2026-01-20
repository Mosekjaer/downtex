import type { LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/supabase.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase } = await requireAuth(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const workspaceId = url.searchParams.get("workspaceId");

  if (!workspaceId) {
    return Response.json({ results: [] });
  }

  const { data: documents } = await supabase
    .from("documents")
    .select("id, title, folder_id")
    .eq("workspace_id", workspaceId)
    .ilike("title", `%${query}%`)
    .order("updated_at", { ascending: false })
    .limit(10);

  return Response.json({ results: documents ?? [] });
}
