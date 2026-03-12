import { redirect, type LoaderFunctionArgs } from "react-router";
import { createSupabaseClient } from "~/lib/supabase.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    console.log("CALLBACK: no code param, redirecting to /login");
    return redirect("/login");
  }

  console.log("CALLBACK: exchanging code", code);
  const { supabase, headers } = createSupabaseClient(request);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("CALLBACK: code exchange failed:", error);
    return redirect("/login");
  }

  console.log("CALLBACK: exchange success, user:", data.user?.email);
  console.log("CALLBACK: Set-Cookie headers:", headers.getSetCookie());

  // The headers contain Set-Cookie with the session tokens
  return redirect("/", { headers });
}

export default function CallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-zinc-500">Signing in...</p>
    </div>
  );
}
