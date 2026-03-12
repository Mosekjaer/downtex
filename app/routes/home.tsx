import { redirect } from "react-router";
import { createSupabaseClient } from "~/lib/supabase.server";
import type { Route } from "./+types/home";

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase } = createSupabaseClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Authenticated — find personal workspace and redirect
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .eq("type", "personal")
    .single();

  if (data) {
    return redirect(`/workspace/${data.id}`);
  }

  return redirect("/login");
}

export default function Home() {
  return null;
}
