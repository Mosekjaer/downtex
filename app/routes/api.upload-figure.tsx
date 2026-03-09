import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/supabase.server";
import { createServiceRoleClient } from "~/lib/supabase.server";

/**
 * Upload a pasted/dropped image as a figure.
 * Accepts multipart form data with: file, workspaceId, documentId, blockId.
 * Stores in Supabase Storage and creates a figures DB record.
 * Returns a signed URL for immediate display.
 */
export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const workspaceId = formData.get("workspaceId") as string;
  const documentId = formData.get("documentId") as string;
  const blockId = formData.get("blockId") as string;

  if (!file || !workspaceId || !documentId || !blockId) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Determine file extension from MIME type
  const mimeToExt: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/webp": "webp",
  };
  const ext = mimeToExt[file.type] || "png";
  const format = ext === "jpg" ? "jpeg" : ext;

  const supabase = createServiceRoleClient();

  // Upload to storage
  const storagePath = `${workspaceId}/${blockId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("figures")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return Response.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Create figures DB record
  await supabase.from("figures").insert({
    document_id: documentId,
    block_id: blockId,
    github_repo: "",
    github_path: "",
    file_type: ext,
    status: "active",
    cached_image_path: storagePath,
    cached_image_format: format,
  });

  // Return signed URL
  const { data: urlData } = await supabase.storage
    .from("figures")
    .createSignedUrl(storagePath, 60 * 60);

  return Response.json({
    ok: true,
    blockId,
    cachedUrl: urlData?.signedUrl ?? null,
    cachedFormat: format,
  });
}
