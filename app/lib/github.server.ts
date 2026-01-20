const GITHUB_API_BASE = "https://api.github.com";

type GitHubRepo = {
  name: string;
  fullName: string;
  private: boolean;
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
    throw new Error(
      `GitHub API rate limit exceeded. Resets at ${resetAt}.`,
    );
  }
}

async function ensureOk(res: Response, context: string): Promise<void> {
  checkRateLimit(res);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `GitHub API error (${res.status}) during ${context}: ${body}`,
    );
  }
}

/**
 * List repositories accessible to the authenticated user.
 */
export async function listUserRepos(
  token: string,
): Promise<GitHubRepo[]> {
  const res = await fetch(
    `${GITHUB_API_BASE}/user/repos?per_page=100&sort=updated`,
    { headers: headers(token) },
  );
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
  const res = await fetch(
    `${GITHUB_API_BASE}/repos/${repo}/contents/${encodeURIComponent(path)}`,
    { headers: headers(token) },
  );

  checkRateLimit(res);

  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `GitHub API error (${res.status}) during getFileSha: ${body}`,
    );
  }

  const data = (await res.json()) as { sha: string };
  return data.sha;
}

/**
 * Get the decoded content of a file in a repository.
 */
export async function getFileContent(
  token: string,
  repo: string,
  path: string,
): Promise<string> {
  const res = await fetch(
    `${GITHUB_API_BASE}/repos/${repo}/contents/${encodeURIComponent(path)}`,
    { headers: headers(token) },
  );
  await ensureOk(res, "getFileContent");

  const data = (await res.json()) as { content: string; encoding: string };

  if (data.encoding !== "base64") {
    throw new Error(
      `Unexpected encoding "${data.encoding}" for ${repo}/${path}`,
    );
  }

  return Buffer.from(data.content, "base64").toString("utf-8");
}
