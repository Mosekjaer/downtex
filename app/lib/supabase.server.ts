import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.server";

export function createSupabaseClient(request: Request): SupabaseClient {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  const accessToken = extractAccessToken(cookieHeader);

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
}

export function createServiceRoleClient(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function extractAccessToken(cookieHeader: string): string | null {
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...rest] = c.trim().split("=");
      return [key, rest.join("=")];
    }),
  );
  return cookies["sb-access-token"] ?? null;
}

export async function requireAuth(request: Request) {
  const supabase = createSupabaseClient(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Response(null, { status: 302, headers: { Location: "/login" } });
  }
  return { supabase, user };
}
