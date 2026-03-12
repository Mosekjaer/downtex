import {
  useLoaderData,
  useFetcher,
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
    // Client-side Supabase linkIdentity redirect
    // Uses the Supabase JS client from the browser
    import("@supabase/supabase-js").then(({ createClient }) => {
      const supabase = createClient(
        window.ENV.SUPABASE_URL,
        window.ENV.SUPABASE_ANON_KEY,
      );
      supabase.auth.linkIdentity({ provider: provider as "github" | "google" });
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-xl font-semibold text-zinc-900">Settings</h1>

      {/* Profile Section */}
      <section className="mt-8">
        <h2 className="text-base font-medium text-zinc-900">Profile</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Update your display name and avatar.
        </p>

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
            {profileResult?.ok && (
              <span className="text-sm text-green-600">Saved</span>
            )}
            {profileResult?.error && (
              <span className="text-sm text-red-600">{profileResult.error}</span>
            )}
          </div>
        </profileFetcher.Form>
      </section>

      {/* Connected Accounts Section */}
      <section className="mt-10">
        <h2 className="text-base font-medium text-zinc-900">Connected accounts</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Link external providers to your account.
        </p>

        <div className="mt-4 space-y-3">
          {KNOWN_PROVIDERS.map((provider) => {
            const isLinked = linkedProviderIds.has(provider.id);
            return (
              <div
                key={provider.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-zinc-900">
                    {provider.label}
                  </span>
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
        <p className="mt-1 text-sm text-zinc-500">
          Choose what notifications you receive.
        </p>

        <notifFetcher.Form method="post" className="mt-4">
          <input type="hidden" name="intent" value="update-notifications" />
          <input
            type="hidden"
            name="emailComments"
            value={emailComments ? "true" : "false"}
          />
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={emailComments}
              onChange={(e) => setEmailComments(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-accent-600 focus:ring-accent-500"
            />
            <span className="text-sm text-zinc-700">
              Email me on new comments
            </span>
          </label>
          <div className="mt-4 flex items-center gap-3">
            <Button type="submit" disabled={notifBusy}>
              {notifBusy ? "Saving..." : "Save notifications"}
            </Button>
            {notifResult?.ok && (
              <span className="text-sm text-green-600">Saved</span>
            )}
            {notifResult?.error && (
              <span className="text-sm text-red-600">{notifResult.error}</span>
            )}
          </div>
        </notifFetcher.Form>
      </section>
    </div>
  );
}
