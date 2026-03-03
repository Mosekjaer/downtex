import {
  useLoaderData,
  useFetcher,
  Link,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "react-router";
import { useState } from "react";
import { requireAuth } from "~/lib/supabase.server";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";

export async function loader({ request }: LoaderFunctionArgs) {
  const { supabase, user } = await requireAuth(request);

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, avatar_url, notification_email_comments")
    .eq("id", user.id)
    .single();

  // Get linked identity providers from the auth user
  const providers =
    user.identities?.map((identity) => ({
      provider: identity.provider,
      createdAt: identity.created_at,
    })) ?? [];

  return {
    profile: {
      displayName: profile?.display_name ?? "",
      avatarUrl: profile?.avatar_url ?? "",
      notificationEmailComments: profile?.notification_email_comments ?? false,
    },
    providers,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, user } = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  switch (intent) {
    case "update-profile": {
      const displayName = (formData.get("displayName") as string)?.trim();
      const avatarUrl = (formData.get("avatarUrl") as string)?.trim();

      if (!displayName) {
        return { ok: false, error: "Display name is required" };
      }

      const { error } = await supabase
        .from("users")
        .update({
          display_name: displayName,
          avatar_url: avatarUrl || null,
        })
        .eq("id", user.id);

      if (error) {
        return { ok: false, error: "Failed to update profile" };
      }
      return { ok: true };
    }

    case "update-notifications": {
      const emailComments = formData.get("emailComments") === "true";

      const { error } = await supabase
        .from("users")
        .update({
          notification_email_comments: emailComments,
        })
        .eq("id", user.id);

      if (error) {
        return { ok: false, error: "Failed to update notification preferences" };
      }
      return { ok: true };
    }

    default:
      return { ok: false, error: "Unknown intent" };
  }
}

const KNOWN_PROVIDERS = [
  { id: "github", label: "GitHub" },
  { id: "google", label: "Google" },
] as const;

export default function SettingsPage() {
  const { profile, providers } = useLoaderData<typeof loader>();
  const profileFetcher = useFetcher();
  const notifFetcher = useFetcher();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [emailComments, setEmailComments] = useState(profile.notificationEmailComments);

  const linkedProviderIds = new Set(providers.map((p) => p.provider));

  const profileBusy = profileFetcher.state !== "idle";
  const notifBusy = notifFetcher.state !== "idle";

  const profileResult = profileFetcher.data as { ok: boolean; error?: string } | undefined;
  const notifResult = notifFetcher.data as { ok: boolean; error?: string } | undefined;

  function handleLinkProvider(provider: string) {
    void import("~/lib/supabase.client").then(({ getSupabaseClient }) => {
      const supabase = getSupabaseClient();
      void supabase.auth.linkIdentity({ provider: provider as "github" | "google" });
    });
  }

  function handleSignOut() {
    void import("~/lib/supabase.client").then(({ getSupabaseClient }) => {
      const supabase = getSupabaseClient();
      void supabase.auth.signOut().then(() => {
        window.location.href = "/login";
      });
    });
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-zinc-200 bg-zinc-50/80">
        <div className="border-b border-zinc-100 p-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-700"
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
            Back
          </Link>
        </div>

        <div className="flex-1 px-2 pt-3">
          <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            User Settings
          </span>
          <nav className="mt-2 flex flex-col gap-0.5">
            <span className="flex items-center gap-2 rounded-md bg-zinc-200/60 px-2 py-1.5 text-sm font-medium text-zinc-900">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Profile & Accounts
            </span>
          </nav>
        </div>

        <div className="border-t border-zinc-100 p-2">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-200/60 hover:text-zinc-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <h1 className="text-xl font-semibold text-zinc-900">Settings</h1>

          {/* Profile Section */}
          <section className="mt-8">
            <h2 className="text-base font-medium text-zinc-900">Profile</h2>
            <p className="mt-1 text-sm text-zinc-500">Update your display name and avatar.</p>

            <profileFetcher.Form method="post" className="mt-4 space-y-4">
              <input type="hidden" name="intent" value="update-profile" />
              <Input
                label="Display name"
                name="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                required
              />
              <Input
                label="Avatar URL"
                name="avatarUrl"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
              />
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={profileBusy}>
                  {profileBusy ? "Saving..." : "Save profile"}
                </Button>
                {profileResult?.ok && <span className="text-sm text-green-600">Saved</span>}
                {profileResult?.error && (
                  <span className="text-sm text-red-600">{profileResult.error}</span>
                )}
              </div>
            </profileFetcher.Form>
          </section>

          {/* Connected Accounts Section */}
          <section className="mt-10">
            <h2 className="text-base font-medium text-zinc-900">Connected accounts</h2>
            <p className="mt-1 text-sm text-zinc-500">Link external providers to your account.</p>

            <div className="mt-4 space-y-3">
              {KNOWN_PROVIDERS.map((provider) => {
                const isLinked = linkedProviderIds.has(provider.id);
                return (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-zinc-900">{provider.label}</span>
                      {isLinked ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          Linked
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                          Not linked
                        </span>
                      )}
                    </div>
                    {!isLinked && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleLinkProvider(provider.id)}
                      >
                        Link {provider.label}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Notifications Section */}
          <section className="mt-10">
            <h2 className="text-base font-medium text-zinc-900">Notifications</h2>
            <p className="mt-1 text-sm text-zinc-500">Choose what notifications you receive.</p>

            <notifFetcher.Form method="post" className="mt-4">
              <input type="hidden" name="intent" value="update-notifications" />
              <input type="hidden" name="emailComments" value={emailComments ? "true" : "false"} />
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailComments}
                  onChange={(e) => setEmailComments(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-accent-600 focus:ring-accent-500"
                />
                <span className="text-sm text-zinc-700">Email me on new comments</span>
              </label>
              <div className="mt-4 flex items-center gap-3">
                <Button type="submit" disabled={notifBusy}>
                  {notifBusy ? "Saving..." : "Save notifications"}
                </Button>
                {notifResult?.ok && <span className="text-sm text-green-600">Saved</span>}
                {notifResult?.error && (
                  <span className="text-sm text-red-600">{notifResult.error}</span>
                )}
              </div>
            </notifFetcher.Form>
          </section>
        </div>
      </main>
    </div>
  );
}
