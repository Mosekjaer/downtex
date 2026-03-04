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
  const providerToken = data.session?.provider_token;
  // eslint-disable-next-line no-console
  console.log(
    "[callback] provider_token present:",
    !!providerToken,
    "provider:",
    data.session?.user?.app_metadata?.provider,
    "user:",
    data.session?.user?.id,
  );

  if (providerToken) {
    try {
      const encryptedBuf = encrypt(providerToken);
      // Store as hex-escaped bytea literal so PostgREST round-trips correctly
      const encryptedToken = "\\x" + encryptedBuf.toString("hex");
      const serviceClient = createServiceRoleClient();
      const { error: updateError } = await serviceClient
        .from("users")
        .update({ github_token_encrypted: encryptedToken })
        .eq("id", data.session.user.id);
      // eslint-disable-next-line no-console
      console.log("[callback] token save:", updateError ? updateError.message : "ok");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[callback] token save exception:", e);
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
