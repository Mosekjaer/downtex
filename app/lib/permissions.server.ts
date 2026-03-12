import type { SupabaseClient } from "@supabase/supabase-js";

export type Role = "owner" | "editor" | "commenter" | "viewer";

const ROLE_RANK: Record<Role, number> = {
  owner: 4,
  editor: 3,
  commenter: 2,
  viewer: 1,
};

export function hasMinimumRole(userRole: Role | null, minimumRole: Role): boolean {
  if (!userRole) return false;
  return ROLE_RANK[userRole] >= ROLE_RANK[minimumRole];
}

export function requireRole(userRole: Role | null, minimumRole: Role): void {
  if (!hasMinimumRole(userRole, minimumRole)) {
    throw new Response(JSON.stringify({ error: "Insufficient permissions", code: "PERMISSION_DENIED" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function getUserWorkspaceRole(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
): Promise<Role | null> {
  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();
  return (data?.role as Role) ?? null;
}

export async function getUserDocumentRole(
  supabase: SupabaseClient,
  documentId: string,
  userId: string,
): Promise<Role | null> {
  const { data } = await supabase.rpc("get_document_role", {
    doc_id: documentId,
    uid: userId,
  });
  return (data as Role) ?? null;
}
