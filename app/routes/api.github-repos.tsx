import type { LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/supabase.server";
import { getUserGitHubToken, listUserRepos } from "~/lib/github.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, user } = await requireAuth(request);

  const token = await getUserGitHubToken(supabase, user.id);
  if (!token) {
    return Response.json({ repos: [], error: "no_token" });
  }

  try {
    const repos = await listUserRepos(token);
    return Response.json({ repos });
  } catch {
    return Response.json({ repos: [], error: "fetch_failed" });
  }
}
