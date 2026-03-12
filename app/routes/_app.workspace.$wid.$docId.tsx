import {
  useLoaderData,
  useFetcher,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "react-router";
import { requireAuth } from "~/lib/supabase.server";
import { getUserDocumentRole, requireRole, type Role } from "~/lib/permissions.server";
import { Editor } from "~/components/editor/Editor";
import { ShareModal } from "~/components/modals/ShareModal";
import { useState, useCallback } from "react";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { supabase, user } = await requireAuth(request);
  const documentId = params.docId ?? "";
  const workspaceId = params.wid ?? "";

  const role = await getUserDocumentRole(supabase, documentId, user.id);
  if (!role) {
    throw new Response("Access denied", { status: 403 });
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, yjs_state, workspace_id, created_by")
    .eq("id", documentId)
    .single();

  if (!doc) {
    throw new Response("Document not found", { status: 404 });
  }

  const [
    { data: workspace },
    { data: collaboratorRows },
    { data: publicLinkRow },
    { data: workspaceDocs },
  ] = await Promise.all([
    supabase.from("workspaces").select("name").eq("id", workspaceId).single(),
    supabase
      .from("document_collaborators")
      .select("user_id, role, profiles:user_id(display_name)")
      .eq("document_id", documentId),
    supabase
      .from("document_public_links")
      .select("token")
      .eq("document_id", documentId)
      .maybeSingle(),
    supabase
      .from("documents")
      .select("id, title, folder_id, folders(name)")
      .eq("workspace_id", workspaceId)
      .neq("id", documentId)
      .order("title"),
  ]);

  // Build collaborator list including the owner
  const collaborators: Array<{ userId: string; displayName: string; role: string }> = [];

  // Add the document owner
  if (doc.created_by) {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", doc.created_by)
      .single();
    collaborators.push({
      userId: doc.created_by,
      displayName: ownerProfile?.display_name ?? "Owner",
      role: "owner",
    });
  }

  // Add explicit collaborators
  if (collaboratorRows) {
    for (const row of collaboratorRows) {
      // Skip if this is the owner (already added)
      if (row.user_id === doc.created_by) continue;
      const profile = row.profiles as unknown as { display_name: string } | null;
      collaborators.push({
        userId: row.user_id,
        displayName: profile?.display_name ?? "Unknown",
        role: row.role,
      });
    }
  }

  // Supabase returns bytea as \x-prefixed hex string
  let yjsStateBase64: string | null = null;
  if (doc.yjs_state) {
    const hex =
      typeof doc.yjs_state === "string" && doc.yjs_state.startsWith("\\x")
        ? doc.yjs_state.slice(2)
        : Buffer.from(doc.yjs_state).toString("hex");
    yjsStateBase64 = Buffer.from(hex, "hex").toString("base64");
  }

  return {
    document: {
      id: doc.id,
      title: doc.title,
      workspaceId: doc.workspace_id,
      workspaceName: workspace?.name ?? "",
      createdBy: doc.created_by,
    },
    yjsStateBase64,
    role: role as Role,
    user: { id: user.id },
    collaborators,
    publicLink: publicLinkRow ? { token: publicLinkRow.token } : null,
    workspaceDocuments: (workspaceDocs ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      folderId: d.folder_id,
      folderName: (d.folders as unknown as { name: string } | null)?.name ?? undefined,
    })),
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { supabase, user } = await requireAuth(request);
  const documentId = params.docId ?? "";
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  const role = await getUserDocumentRole(supabase, documentId, user.id);

  switch (intent) {
    case "update-title": {
      requireRole(role, "editor");
      const title = formData.get("title") as string;
      await supabase.from("documents").update({ title }).eq("id", documentId);
      return { ok: true };
    }
    case "save-yjs-state": {
      requireRole(role, "editor");
      const stateBase64 = formData.get("state") as string;
      // Supabase expects bytea as \x-prefixed hex string, not a Buffer object
      const stateHex = "\\x" + Buffer.from(stateBase64, "base64").toString("hex");
      await supabase
        .from("documents")
        .update({ yjs_state: stateHex, updated_at: new Date().toISOString() })
        .eq("id", documentId);
      return { ok: true };
    }
    case "share-user": {
      requireRole(role, "editor");
      const email = formData.get("email") as string | null;
      const userId = formData.get("userId") as string | null;
      const shareRole = formData.get("role") as string;

      if (!["editor", "commenter", "viewer"].includes(shareRole)) {
        return { ok: false, error: "Invalid role" };
      }

      let targetUserId = userId;

      // If email provided, look up the user
      if (email && !targetUserId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .single();

        if (!profile) {
          return { ok: false, error: "No user found with that email address" };
        }
        targetUserId = profile.id;
      }

      if (!targetUserId) {
        return { ok: false, error: "No user specified" };
      }

      // Upsert the collaborator row
      const { error } = await supabase.from("document_collaborators").upsert(
        {
          document_id: documentId,
          user_id: targetUserId,
          role: shareRole,
        },
        { onConflict: "document_id,user_id" },
      );

      if (error) {
        return { ok: false, error: "Failed to share document" };
      }

      return { ok: true };
    }
    case "remove-share": {
      requireRole(role, "editor");
      const removeUserId = formData.get("userId") as string;

      await supabase
        .from("document_collaborators")
        .delete()
        .eq("document_id", documentId)
        .eq("user_id", removeUserId);

      return { ok: true };
    }
    case "enable-public-link": {
      requireRole(role, "editor");

      // Check if link already exists
      const { data: existing } = await supabase
        .from("document_public_links")
        .select("token")
        .eq("document_id", documentId)
        .maybeSingle();

      if (existing) {
        return { ok: true, token: existing.token };
      }

      const { data, error } = await supabase
        .from("document_public_links")
        .insert({
          document_id: documentId,
          token: crypto.randomUUID(),
          created_by: user.id,
        })
        .select("token")
        .single();

      if (error) {
        return { ok: false, error: "Failed to create public link" };
      }

      return { ok: true, token: data.token };
    }
    case "disable-public-link": {
      requireRole(role, "editor");

      await supabase.from("document_public_links").delete().eq("document_id", documentId);

      return { ok: true };
    }
    case "insert-figure": {
      requireRole(role, "editor");
      const blockId = formData.get("blockId") as string;
      const githubRepo = formData.get("githubRepo") as string;
      const githubPath = formData.get("githubPath") as string;

      if (!blockId || !githubRepo || !githubPath) {
        return { ok: false, error: "Missing required figure fields" };
      }

      const { error: figureError } = await supabase.from("figures").insert({
        document_id: documentId,
        block_id: blockId,
        github_repo: githubRepo,
        github_path: githubPath,
        status: "active",
      });

      if (figureError) {
        return { ok: false, error: figureError.message };
      }

      return { ok: true };
    }
    case "restore-snapshot": {
      requireRole(role, "editor");
      const snapshotId = formData.get("snapshotId") as string;
      if (!snapshotId) {
        return { ok: false, error: "Missing snapshotId" };
      }

      const { data: snapshot, error: snapError } = await supabase
        .from("document_snapshots")
        .select("content_json")
        .eq("id", snapshotId)
        .eq("document_id", documentId)
        .single();

      if (snapError || !snapshot) {
        return { ok: false, error: "Snapshot not found" };
      }

      const yjsBase64 = snapshot.content_json?.yjs_state_base64;
      if (!yjsBase64) {
        return { ok: false, error: "Snapshot has no content" };
      }

      const restoredBuffer = Buffer.from(yjsBase64, "base64");
      await supabase
        .from("documents")
        .update({
          yjs_state: restoredBuffer,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      return { ok: true };
    }
    default:
      return { ok: false, error: "Unknown intent" };
  }
}

export default function DocumentEditorPage() {
  const { document, yjsStateBase64, role, collaborators, publicLink, workspaceDocuments } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [title, setTitle] = useState(document.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const isEditable = role === "owner" || role === "editor";

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false);
    if (title !== document.title) {
      fetcher.submit({ intent: "update-title", title }, { method: "post" });
    }
  }, [title, document.title, fetcher]);

  const handleExport = useCallback(() => {
    const form = window.document.createElement("form");
    form.method = "POST";
    form.action = `/api/export/${document.id}`;
    window.document.body.appendChild(form);
    form.submit();
    form.remove();
  }, [document.id]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
        <div className="flex items-center gap-3">
          {isEditingTitle ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleBlur();
              }}
              className="rounded border border-zinc-300 px-2 py-1 text-sm font-medium focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              autoFocus
            />
          ) : (
            <button
              onClick={() => isEditable && setIsEditingTitle(true)}
              className="text-sm font-medium text-zinc-900 hover:text-accent-600"
            >
              {title}
            </button>
          )}
          <span className="text-xs text-zinc-400">{document.workspaceName}</span>
        </div>
        <div className="flex items-center gap-2">
          {isEditable && (
            <>
              <button
                onClick={() => setShareOpen(true)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
              >
                Share
              </button>
              <button
                onClick={handleExport}
                className="rounded-md bg-accent-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
              >
                Export PDF
              </button>
            </>
          )}
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <Editor
          key={document.id}
          documentId={document.id}
          initialStateBase64={yjsStateBase64}
          editable={isEditable}
          workspaceId={document.workspaceId}
          documents={workspaceDocuments}
        />
      </div>
      {isEditable && (
        <ShareModal
          documentId={document.id}
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          currentCollaborators={collaborators}
          publicLink={publicLink}
        />
      )}
    </div>
  );
}
