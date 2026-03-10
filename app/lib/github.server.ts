import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "./crypto.server";

const GITHUB_API_BASE = "https://api.github.com";

type GitHubRepo = {
  name: string;
  fullName: string;
  private: boolean;
};

type TreeItem = {
  name: string;
  type: "file" | "dir";
  path: string;
  sha: string | null;
};

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function checkRateLimit(res: Response): void {
  const remaining = res.headers.get("X-RateLimit-Remaining");
  if (remaining !== null && parseInt(remaining, 10) === 0) {
    const resetEpoch = res.headers.get("X-RateLimit-Reset");
    const resetAt = resetEpoch
      ? new Date(parseInt(resetEpoch, 10) * 1000).toISOString()
      : "unknown";
    throw new Error(`GitHub API rate limit exceeded. Resets at ${resetAt}.`);
  }
}

async function ensureOk(res: Response, context: string): Promise<void> {
  checkRateLimit(res);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API error (${res.status}) during ${context}: ${body}`);
  }
}

/**
 * List repositories accessible to the authenticated user.
 */
export async function listUserRepos(token: string): Promise<GitHubRepo[]> {
  const res = await fetch(`${GITHUB_API_BASE}/user/repos?per_page=100&sort=updated`, {
    headers: headers(token),
  });
  await ensureOk(res, "listUserRepos");

  const data = (await res.json()) as Array<{
    name: string;
    full_name: string;
    private: boolean;
  }>;

  return data.map((r) => ({
    name: r.name,
    fullName: r.full_name,
    private: r.private,
  }));
}

/**
 * Get the SHA of a file in a repository. Returns null if the file does not exist.
 */
export async function getFileSha(
  token: string,
  repo: string,
  path: string,
): Promise<string | null> {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${repo}/contents/${encodeURIComponent(path)}`, {
    headers: headers(token),
  });

  checkRateLimit(res);

  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API error (${res.status}) during getFileSha: ${body}`);
  }

  const data = (await res.json()) as { sha: string };
  return data.sha;
}

/**
 * Get the decoded content of a file in a repository.
 */
export async function getFileContent(token: string, repo: string, path: string): Promise<string> {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${repo}/contents/${encodeURIComponent(path)}`, {
    headers: headers(token),
  });
  await ensureOk(res, "getFileContent");

  const data = (await res.json()) as { content: string; encoding: string };

  if (data.encoding !== "base64") {
    throw new Error(`Unexpected encoding "${data.encoding}" for ${repo}/${path}`);
  }

  return Buffer.from(data.content, "base64").toString("utf-8");
}

/**
 * Get the raw binary content of a file in a repository.
 */
export async function getFileContentRaw(
  token: string,
  repo: string,
  path: string,
): Promise<Buffer> {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${repo}/contents/${encodeURIComponent(path)}`, {
    headers: headers(token),
  });
  await ensureOk(res, "getFileContentRaw");

  const data = (await res.json()) as { content: string; encoding: string };

  if (data.encoding !== "base64") {
    throw new Error(`Unexpected encoding "${data.encoding}" for ${repo}/${path}`);
  }

  return Buffer.from(data.content, "base64");
}

const SUPPORTED_EXTENSIONS = new Set(["drawio", "png", "jpg", "jpeg", "gif", "svg"]);

function getExtension(filename: string): string {
  if (filename.endsWith(".drawio.svg") || filename.endsWith(".drawio.png")) {
    return "drawio";
  }
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

/**
 * List directory contents of a GitHub repo, filtered to supported figure file types.
 */
export async function getRepoTree(token: string, repo: string, path?: string): Promise<TreeItem[]> {
  const endpoint = path
    ? `${GITHUB_API_BASE}/repos/${repo}/contents/${encodeURIComponent(path)}`
    : `${GITHUB_API_BASE}/repos/${repo}/contents`;

  const res = await fetch(endpoint, { headers: headers(token) });
  await ensureOk(res, "getRepoTree");

  const data = (await res.json()) as Array<{
    name: string;
    type: string;
    path: string;
    sha: string;
  }>;

  return data
    .filter((item) => {
      if (item.type === "dir") return true;
      return SUPPORTED_EXTENSIONS.has(getExtension(item.name));
    })
    .map((item) => ({
      name: item.name,
      type: item.type === "dir" ? ("dir" as const) : ("file" as const),
      path: item.path,
      sha: item.type === "dir" ? null : item.sha,
    }));
}

/**
 * Retrieve and decrypt the user's stored GitHub OAuth token.
 * Returns null if no token is stored.
 */
export async function getUserGitHubToken(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("github_token_encrypted")
    .eq("id", userId)
    .single();

  if (!data?.github_token_encrypted) return null;

  try {
    // PostgREST returns bytea as hex-escaped string like "\x0a1b..."
    const raw = data.github_token_encrypted as string;
    const hex = raw.startsWith("\\x") ? raw.slice(2) : raw;
    const token = decrypt(Buffer.from(hex, "hex"));

    // Validate the token is still active with a lightweight API call
    const res = await fetch(`${GITHUB_API_BASE}/user`, { headers: headers(token) });
    if (res.status === 401 || res.status === 403) {
      // Token is expired or revoked — clear it so the user re-authenticates
      await supabase.from("users").update({ github_token_encrypted: null }).eq("id", userId);
      return null;
    }

    return token;
  } catch {
    return null;
  }
}
