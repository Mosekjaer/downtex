import { redirect, type LoaderFunctionArgs } from "react-router";
import { createSupabaseClient } from "~/lib/supabase.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/login");
  }

  const supabase = createSupabaseClient(request);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirect("/login");
  }

  return redirect("/");
}
