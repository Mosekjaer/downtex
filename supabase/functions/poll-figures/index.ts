// supabase/functions/poll-figures/index.ts
//
// Supabase Edge Function that polls GitHub for updates to Draw.io figures.
// Intended to run on a cron schedule, e.g. every 5 minutes:
//   cron: "*/5 * * * *"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GITHUB_API_BASE = "https://api.github.com";

interface FigureRow {
  id: string;
  github_repo: string;
  github_path: string;
  last_sha: string | null;
  status: string;
}

/**
 * Fetch the current SHA of a file from the GitHub Contents API.
 * Uses the GITHUB_SERVICE_TOKEN env var for authentication.
 */
async function getFileSha(
  token: string,
  repo: string,
  path: string,
): Promise<string | null> {
  const url = `${GITHUB_API_BASE}/repos/${repo}/contents/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (res.status === 404) return null;

  // Check rate limit
  const remaining = res.headers.get("X-RateLimit-Remaining");
  if (remaining !== null && parseInt(remaining, 10) === 0) {
    throw new Error("GitHub API rate limit exceeded");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API error (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { sha: string };
  return data.sha;
}

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const githubToken = Deno.env.get("GITHUB_SERVICE_TOKEN");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase env vars" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!githubToken) {
      return new Response(
        JSON.stringify({ error: "Missing GITHUB_SERVICE_TOKEN env var" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch all active figures grouped by distinct repo+path
    const { data: figures, error: fetchError } = await supabase
      .from("figures")
      .select("id, github_repo, github_path, last_sha, status")
      .eq("status", "active");

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!figures || figures.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active figures to poll", updated: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // De-duplicate by repo+path to avoid redundant GitHub API calls
    const uniqueKeys = new Map<string, { repo: string; path: string }>();
    for (const fig of figures as FigureRow[]) {
      const key = `${fig.github_repo}::${fig.github_path}`;
      if (!uniqueKeys.has(key)) {
        uniqueKeys.set(key, { repo: fig.github_repo, path: fig.github_path });
      }
    }

    // Fetch current SHAs from GitHub
    const shaMap = new Map<string, string | null>();
    for (const [key, { repo, path }] of uniqueKeys) {
      try {
        const sha = await getFileSha(githubToken, repo, path);
        shaMap.set(key, sha);
      } catch (err) {
        // Mark all figures with this key as errored
        const errorMsg = err instanceof Error ? err.message : String(err);
        const ids = (figures as FigureRow[])
          .filter((f) => `${f.github_repo}::${f.github_path}` === key)
          .map((f) => f.id);

        for (const id of ids) {
          await supabase
            .from("figures")
            .update({ status: "error", error_message: errorMsg })
            .eq("id", id);
        }
        continue;
      }
    }

    // Update figures where the SHA has changed
    let updatedCount = 0;
    for (const fig of figures as FigureRow[]) {
      const key = `${fig.github_repo}::${fig.github_path}`;
      const currentSha = shaMap.get(key);

      // Skip if we couldn't fetch this key (already marked as error)
      if (currentSha === undefined) continue;

      // File was deleted
      if (currentSha === null) {
        await supabase
          .from("figures")
          .update({
            status: "error",
            error_message: "File not found on GitHub",
          })
          .eq("id", fig.id);
        updatedCount++;
        continue;
      }

      // SHA changed (or first time)
      if (currentSha !== fig.last_sha) {
        await supabase
          .from("figures")
          .update({
            last_sha: currentSha,
            status: "active",
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", fig.id);
        updatedCount++;
      }
    }

    return new Response(
      JSON.stringify({ message: "Poll complete", updated: updatedCount }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
