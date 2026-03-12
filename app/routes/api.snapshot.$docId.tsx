import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/supabase.server";
import { getUserDocumentRole, requireRole } from "~/lib/permissions.server";

export async function action({ request, params }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { supabase, user } = await requireAuth(request);
  const documentId = params.docId ?? "";

  const role = await getUserDocumentRole(supabase, documentId, user.id);
  requireRole(role, "editor");

  // Read current yjs_state from documents table
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("yjs_state")
    .eq("id", documentId)
    .single();

  if (docError || !doc) {
    return Response.json({ ok: false, error: "Document not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const label = (formData.get("label") as string) || `Manual snapshot \u00b7 ${formattedDate}`;

  // Store yjs_state as base64 in a JSON field
  const contentBase64 = doc.yjs_state ? Buffer.from(doc.yjs_state).toString("base64") : null;

  const { data: snapshot, error: insertError } = await supabase
    .from("document_snapshots")
    .insert({
      document_id: documentId,
      label,
      content_json: { yjs_state_base64: contentBase64 },
      type: "manual",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError) {
    return Response.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  return Response.json({ ok: true, snapshotId: snapshot.id });
}
