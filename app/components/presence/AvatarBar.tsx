import { useState, useEffect } from "react";
import type { SupabaseYjsProvider } from "~/lib/yjs-supabase-provider";

interface PresenceUser {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  cursorColor: string;
}

interface AvatarBarProps {
  provider: SupabaseYjsProvider | null;
  currentUserId: string;
}

export function AvatarBar({ provider, currentUserId }: AvatarBarProps) {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!provider) return;

    const unsubscribe = provider.onPresenceChange((presences) => {
      const seen = new Set<string>();
      const unique: PresenceUser[] = [];
      for (const p of presences) {
        if (p.userId === currentUserId || seen.has(p.userId)) continue;
        seen.add(p.userId);
        unique.push({
          userId: p.userId,
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
          cursorColor: p.cursorColor,
        });
      }
      setUsers(unique);
    });

    return unsubscribe;
  }, [provider, currentUserId]);

  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {users.map((user) => (
        <div
          key={user.userId}
          className="group relative"
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="h-6 w-6 rounded-full ring-2"
              style={{ ringColor: user.cursorColor }}
            />
          ) : (
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: user.cursorColor }}
            >
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute -bottom-8 left-1/2 z-50 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-white group-hover:block">
            {user.displayName}
          </div>
        </div>
      ))}
    </div>
  );
}
