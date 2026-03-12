import { redirect } from "react-router";
import { createSupabaseClient } from "~/lib/supabase.server";
import type { Route } from "./+types/home";

export async function loader({ request }: Route.LoaderArgs) {
  console.log("HOME: cookies:", request.headers.get("Cookie")?.substring(0, 100));
  const { supabase } = createSupabaseClient(request);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("HOME: user:", user?.email, "error:", userError?.message);

  if (!user) {
    return redirect("/login");
  }

  // Authenticated — find personal workspace and redirect
  const { data, error: wsError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .eq("type", "personal")
    .single();

  console.log("HOME: workspace:", data, "error:", wsError);

  if (data) {
    return redirect(`/workspace/${data.id}`);
  }

  return redirect("/login");
}

export default function Home() {
  return null;
}
