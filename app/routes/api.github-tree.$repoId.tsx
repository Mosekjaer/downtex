import type { LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/supabase.server";
import { getUserGitHubToken, getRepoTree } from "~/lib/github.server";
import { getUserWorkspaceRole } from "~/lib/permissions.server";
import { env } from "~/lib/env.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { supabase, user } = await requireAuth(request);
  const repoId = params.repoId ?? "";

  const { data: repo } = await supabase
    .from("workspace_repositories")
    .select("github_repo, workspace_id")
    .eq("id", repoId)
    .single();

  if (!repo) {
    return Response.json({ error: "Repository not found" }, { status: 404 });
  }

  const role = await getUserWorkspaceRole(supabase, repo.workspace_id, user.id);
  if (!role) {
    return Response.json({ error: "Not a workspace member" }, { status: 403 });
  }

  const token = (await getUserGitHubToken(supabase, user.id)) ?? env.GITHUB_SERVICE_TOKEN;

  if (!token) {
    return Response.json(
      { error: "No GitHub token available. Please re-authenticate with GitHub." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? undefined;

  const items = await getRepoTree(token, repo.github_repo, path);
  return Response.json({ items });
}
