import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { createClient as createBareClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { env } from "./env.server";

/**
 * Per-request cache for getUser() results.
 *
 * React Router 7 creates a new Request object per loader even within the same
 * HTTP request (single fetch), so a WeakMap<Request, …> never deduplicates.
 * Instead we key on the raw Cookie header — all loaders in one HTTP request
 * share the same cookies. Entries expire after 5 seconds to prevent leaks.
 */
const userPromiseCache = new Map<string, { promise: Promise<User | null>; expiresAt: number }>();
const CACHE_TTL_MS = 5_000;

function getCachedUserPromise(
  supabase: SupabaseClient,
  cookieHeader: string,
): Promise<User | null> {
  const now = Date.now();

  // Lazy cleanup of expired entries
  if (userPromiseCache.size > 50) {
    for (const [key, entry] of userPromiseCache) {
      if (entry.expiresAt < now) userPromiseCache.delete(key);
    }
  }

  const cached = userPromiseCache.get(cookieHeader);
  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = supabase.auth.getUser().then(({ data, error }) => {
    if (error) return null;
    return data.user;
  });

  userPromiseCache.set(cookieHeader, { promise, expiresAt: now + CACHE_TTL_MS });
  return promise;
}

function createClient(request: Request) {
  const headers = new Headers();
  const cookieHeader = request.headers.get("Cookie") ?? "";

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(cookieHeader) as {
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

  return { supabase, headers, cookieHeader };
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
  const { supabase, headers } = createClient(request);
  return { supabase, headers };
}

export function createServiceRoleClient(): SupabaseClient {
  return createBareClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function requireAuth(request: Request) {
  const { supabase, headers, cookieHeader } = createClient(request);
  const user = await getCachedUserPromise(supabase, cookieHeader);
  if (!user) {
    throw new Response(null, { status: 302, headers: { Location: "/login" } });
  }
  return { supabase, headers, user };
}
