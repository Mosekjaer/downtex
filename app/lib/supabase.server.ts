import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { env } from "./env.server";

/**
 * Per-request cache for the Supabase client + auth result.
 * Multiple loaders sharing the same Request object (React Router runs parent
 * and child loaders with the same Request) will reuse a single getUser() call.
 */
const requestCache = new WeakMap<
  Request,
  { supabase: SupabaseClient; headers: Headers; userPromise: Promise<User | null> }
>();

function getOrCreateClient(request: Request) {
  const cached = requestCache.get(request);
  if (cached) return cached;

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

  const userPromise = supabase.auth.getUser().then(({ data, error }) => {
    if (error) return null;
    return data.user;
  });

  const entry = { supabase, headers, userPromise };
  requestCache.set(request, entry);
  return entry;
}

/**
 * Creates a Supabase client for use in loaders/actions.
 * Returns the client and a headers object that must be merged into the response
 * (it contains Set-Cookie headers for refreshed tokens).
 */
export function createSupabaseClient(request: Request): {
  supabase: SupabaseClient;
  headers: Headers;
} {
  const { supabase, headers } = getOrCreateClient(request);
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
  const { supabase, headers, userPromise } = getOrCreateClient(request);
  const user = await userPromise;
  if (!user) {
    throw new Response(null, { status: 302, headers: { Location: "/login" } });
  }
  return { supabase, headers, user };
}
