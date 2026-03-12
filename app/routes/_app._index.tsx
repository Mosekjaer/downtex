import { redirect, type LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/supabase.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, user } = await requireAuth(request);

  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .eq("type", "personal")
    .single();

  if (!data) {
    throw new Response("Personal workspace not found", { status: 500 });
  }

  return redirect(`/workspace/${data.id}`);
}
