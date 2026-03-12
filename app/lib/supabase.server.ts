import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.server";

/**
 * Creates a Supabase client for use in loaders/actions.
 * Returns the client and a headers object that must be merged into the response
 * (it contains Set-Cookie headers for refreshed tokens).
 */
export function createSupabaseClient(request: Request): {
  supabase: SupabaseClient;
  headers: Headers;
} {
  const headers = new Headers();

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "") as {
          name: string;
          value: string;
        }[];
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          headers.append("Set-Cookie", serializeCookieHeader(name, value, options));
        });
      },
    },
  });

  return { supabase, headers };
}

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports */
export function createServiceRoleClient(): SupabaseClient {
  const { createClient } =
    require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
/* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports */

export async function requireAuth(request: Request) {
  const { supabase, headers } = createSupabaseClient(request);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Response(null, { status: 302, headers: { Location: "/login" } });
  }
  return { supabase, headers, user };
}
