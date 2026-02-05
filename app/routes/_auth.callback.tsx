import { redirect, type LoaderFunctionArgs } from "react-router";
import { createSupabaseClient } from "~/lib/supabase.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/login");
  }

  const { supabase, headers } = createSupabaseClient(request);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirect("/login");
  }

  return redirect("/", { headers });
}

export default function CallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-zinc-500">Signing in...</p>
    </div>
  );
}
