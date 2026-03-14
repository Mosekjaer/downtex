import {
  useLoaderData,
  useFetcher,
  useNavigate,
  useParams,
  Link,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "react-router";
import { requireAuth } from "~/lib/supabase.server";
import { getUserWorkspaceRole, requireRole, hasMinimumRole } from "~/lib/permissions.server";
import { getUserGitHubToken, getFileSha } from "~/lib/github.server";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { Avatar } from "~/components/ui/Avatar";
import { useState, useEffect } from "react";

interface Member {
  user_id: string;
  role: string;
  display_name: string;
  avatar_url: string | null;
  email: string;
}

interface ConnectedRepo {
  id: string;
  github_repo: string;
  display_name: string;
  status: string;
}

const REPO_PATTERN = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { supabase, user } = await requireAuth(request);
  const workspaceId = params.wid ?? "";

  const role = await getUserWorkspaceRole(supabase, workspaceId, user.id);
  requireRole(role, "owner");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, type, owner_id")
    .eq("id", workspaceId)
    .single();

  const { data: members } = await supabase
    .from("workspace_members")
    .select("user_id, role, users(display_name, avatar_url, email)")
    .eq("workspace_id", workspaceId);

  const memberList: Member[] = (members ?? []).map((m) => {
    const u = m.users as unknown as {
      display_name: string;
      avatar_url: string | null;
      email: string;
    };
    return {
      user_id: m.user_id,
      role: m.role,
      display_name: u?.display_name ?? "Unknown",
      avatar_url: u?.avatar_url ?? null,
      email: u?.email ?? "",
    };
  });

  const { data: repos } = await supabase
    .from("workspace_repositories")
    .select("id, github_repo, display_name, status")
    .eq("workspace_id", workspaceId)
    .neq("status", "disconnected");

  return {
    workspace,
    members: memberList,
    connectedRepos: (repos ?? []) as ConnectedRepo[],
    userId: user.id,
    userRole: role,
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { supabase, user } = await requireAuth(request);
  const workspaceId = params.wid ?? "";
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  const role = await getUserWorkspaceRole(supabase, workspaceId, user.id);

  // Repo actions require editor+, other settings require owner
  if (intent === "connect-repo" || intent === "disconnect-repo") {
    requireRole(role, "editor");
  } else {
    requireRole(role, "owner");
  }

  switch (intent) {
    case "connect-repo": {
      const githubRepo = (formData.get("githubRepo") as string)?.trim();
      if (!githubRepo || !REPO_PATTERN.test(githubRepo)) {
        return { ok: false, error: "Invalid format. Use owner/repo (e.g. octocat/hello-world)" };
      }

      const token = await getUserGitHubToken(supabase, user.id);
      if (!token) {
        return {
          ok: false,
          error: "No GitHub token found. Please sign out and sign in again with GitHub.",
        };
      }

      const sha = await getFileSha(token, githubRepo, "README.md").catch(() => null);
      if (sha === null) {
        const canAccess = await getFileSha(token, githubRepo, ".").catch(() => "error");
        if (canAccess === "error") {
          return {
            ok: false,
            error: "Cannot access this repository. Check the name and your permissions.",
          };
        }
      }

      const displayName = githubRepo.split("/").pop() ?? githubRepo;

      const { error: insertError } = await supabase.from("workspace_repositories").insert({
        workspace_id: workspaceId,
        github_repo: githubRepo,
        display_name: displayName,
        connected_by: user.id,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          return { ok: false, error: "This repository is already connected." };
        }
        return { ok: false, error: "Failed to connect repository." };
      }

      return { ok: true };
    }

    case "disconnect-repo": {
      const repoId = formData.get("repoId") as string;

      const { error: updateError } = await supabase
        .from("workspace_repositories")
        .update({ status: "disconnected", updated_at: new Date().toISOString() })
        .eq("id", repoId)
        .eq("workspace_id", workspaceId);

      if (updateError) {
        return { ok: false, error: "Failed to disconnect repository." };
      }

      return { ok: true };
    }

    case "invite-member": {
      const email = (formData.get("email") as string)?.trim();
      const memberRole = formData.get("role") as string;
      if (!email) return { ok: false, error: "Email is required" };

      // Look up user by email
      const { data: targetUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (!targetUser) {
        return { ok: false, error: "No user found with that email" };
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", targetUser.id)
        .single();

      if (existing) {
        return { ok: false, error: "User is already a member" };
      }

      await supabase.from("workspace_members").insert({
        workspace_id: workspaceId,
        user_id: targetUser.id,
        role: memberRole || "viewer",
      });

      return { ok: true };
    }

    case "update-member-role": {
      const targetUserId = formData.get("userId") as string;
      const newRole = formData.get("role") as string;

      await supabase
        .from("workspace_members")
        .update({ role: newRole })
        .eq("workspace_id", workspaceId)
        .eq("user_id", targetUserId);

      return { ok: true };
    }

    case "remove-member": {
      const targetUserId = formData.get("userId") as string;

      // Prevent removing the last owner
      const { data: owners } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId)
        .eq("role", "owner");

      if (owners && owners.length <= 1 && owners.some((o) => o.user_id === targetUserId)) {
        return { ok: false, error: "Cannot remove the last owner" };
      }

      await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", targetUserId);

      return { ok: true };
    }

    case "update-workspace": {
      const name = (formData.get("name") as string)?.trim();
      if (!name) return { ok: false, error: "Name is required" };

      await supabase.from("workspaces").update({ name }).eq("id", workspaceId);

      return { ok: true };
    }

    case "delete-workspace": {
      await supabase.from("workspaces").delete().eq("id", workspaceId);
      return { ok: true, deleted: true };
    }

    default:
      return { ok: false, error: "Unknown intent" };
  }
}

export default function WorkspaceSettings() {
  const { workspace, members, connectedRepos, userId, userRole } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const params = useParams();

  const [wsName, setWsName] = useState(workspace?.name ?? "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [repoInput, setRepoInput] = useState("");

  const isEditor = hasMinimumRole(userRole, "editor");

  const fetcherData = fetcher.data as
    | { ok?: boolean; error?: string; deleted?: boolean }
    | undefined;

  // Redirect after workspace deletion
  useEffect(() => {
    if (fetcherData?.deleted && fetcher.state === "idle") {
      navigate("/");
    }
  }, [fetcherData, fetcher.state, navigate]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link
        to={`/workspace/${params.wid}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-700"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to workspace
      </Link>
      <h1 className="mb-6 text-xl font-semibold text-zinc-900">Workspace Settings</h1>

      {/* Error display */}
      {fetcherData?.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {fetcherData.error}
        </div>
      )}

      {/* Workspace name */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          General
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetcher.submit({ intent: "update-workspace", name: wsName }, { method: "post" });
          }}
          className="flex items-end gap-3"
        >
          <div className="flex-1">
            <Input
              label="Workspace name"
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
            />
          </div>
          <Button type="submit" size="md" disabled={!wsName.trim()}>
            Save
          </Button>
        </form>
      </section>

      {/* Members */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Members
        </h2>
        <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
          {members.map((member) => (
            <div key={member.user_id} className="flex items-center gap-3 px-4 py-3">
              <Avatar src={member.avatar_url} name={member.display_name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {member.display_name}
                  {member.user_id === userId && (
                    <span className="ml-1 text-xs text-zinc-400">(you)</span>
                  )}
                </p>
                <p className="truncate text-xs text-zinc-500">{member.email}</p>
              </div>
              <select
                value={member.role}
                onChange={(e) =>
                  fetcher.submit(
                    {
                      intent: "update-member-role",
                      userId: member.user_id,
                      role: e.target.value,
                    },
                    { method: "post" },
                  )
                }
                className="rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-accent-500"
                disabled={member.user_id === userId}
              >
                <option value="owner">Owner</option>
                <option value="editor">Editor</option>
                <option value="commenter">Commenter</option>
                <option value="viewer">Viewer</option>
              </select>
              {member.user_id !== userId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    fetcher.submit(
                      { intent: "remove-member", userId: member.user_id },
                      { method: "post" },
                    )
                  }
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Invite */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Invite Member
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetcher.submit(
              { intent: "invite-member", email: inviteEmail, role: inviteRole },
              { method: "post" },
            );
            setInviteEmail("");
          }}
          className="flex items-end gap-3"
        >
          <div className="flex-1">
            <Input
              label="Email"
              type="email"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            <option value="viewer">Viewer</option>
            <option value="commenter">Commenter</option>
            <option value="editor">Editor</option>
            <option value="owner">Owner</option>
          </select>
          <Button type="submit" disabled={!inviteEmail.trim()}>
            Invite
          </Button>
        </form>
      </section>

      {/* Connected Repositories */}
      {isEditor && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Connected Repositories
          </h2>

          {connectedRepos.length > 0 && (
            <div className="mb-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
              {connectedRepos.map((repo) => (
                <div key={repo.id} className="flex items-center gap-3 px-4 py-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-zinc-400"
                  >
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                    <path d="M9 18c-4.51 2-5-2-7-2" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {repo.display_name}
                    </p>
                    <p className="truncate text-xs text-zinc-500">{repo.github_repo}</p>
                  </div>
                  {repo.status === "error" && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Error
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      fetcher.submit(
                        { intent: "disconnect-repo", repoId: repo.id },
                        { method: "post" },
                      )
                    }
                  >
                    Disconnect
                  </Button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetcher.submit(
                { intent: "connect-repo", githubRepo: repoInput },
                { method: "post" },
              );
              setRepoInput("");
            }}
            className="flex items-end gap-3"
          >
            <div className="flex-1">
              <Input
                label="GitHub repository"
                placeholder="owner/repo"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!repoInput.trim()}>
              Connect
            </Button>
          </form>
        </section>
      )}

      {/* Danger zone */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-red-500">
          Danger Zone
        </h2>
        <div className="rounded-lg border border-red-200 p-4">
          <p className="mb-3 text-sm text-zinc-600">
            Permanently delete this workspace and all its folders and documents. This action cannot
            be undone.
          </p>
          <Button
            variant="danger"
            onClick={() => {
              if (
                confirm("Are you sure you want to delete this workspace? This cannot be undone.")
              ) {
                fetcher.submit({ intent: "delete-workspace" }, { method: "post" });
              }
            }}
          >
            Delete workspace
          </Button>
        </div>
      </section>
    </div>
  );
}
