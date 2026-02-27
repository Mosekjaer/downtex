import { redirect, type LoaderFunctionArgs } from "react-router";
import { createSupabaseClient, createServiceRoleClient } from "~/lib/supabase.server";
import { encrypt } from "~/lib/crypto.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/login");
  }

  const { supabase, headers } = createSupabaseClient(request);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirect("/login");
  }

  // Capture and encrypt the GitHub OAuth token for later API use
  if (data.session?.provider_token) {
    try {
      const encryptedToken = encrypt(data.session.provider_token);
      const serviceClient = createServiceRoleClient();
      await serviceClient
        .from("users")
        .update({ github_token_encrypted: encryptedToken })
        .eq("id", data.session.user.id);
    } catch {
      // Non-fatal: token capture failure should not block login
    }
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
