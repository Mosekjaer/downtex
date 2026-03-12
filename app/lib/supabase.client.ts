import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = window.ENV.SUPABASE_URL;
  const anonKey = window.ENV.SUPABASE_ANON_KEY;

  client = createBrowserClient(url, anonKey);
  return client;
}

declare global {
  interface Window {
    ENV: {
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
    };
  }
}
