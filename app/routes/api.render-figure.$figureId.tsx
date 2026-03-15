import type { ActionFunctionArgs } from "react-router";
import { createServiceRoleClient } from "~/lib/supabase.server";
import { getUserGitHubToken } from "~/lib/github.server";
import { convertDrawioToSvg, fetchImageBuffer, getDrawioRawUrl } from "~/lib/drawio.server";
import { env } from "~/lib/env.server";

const CONTENT_TYPES: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
};

export async function action({ request, params }: ActionFunctionArgs) {
  const figureId = params.figureId ?? "";

  const authHeader = request.headers.get("Authorization");
  const isServiceRole = authHeader === `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`;

  if (!isServiceRole) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  const { data: figure } = await supabase
    .from("figures")
    .select(
      "id, document_id, github_repo, github_path, file_type, workspace_repository_id, documents(workspace_id)",
    )
    .eq("id", figureId)
    .single();

  if (!figure) {
    return Response.json({ error: "Figure not found" }, { status: 404 });
  }

  // Get a GitHub token: try connected_by user, fallback to service token
  let token: string | null = null;
  if (figure.workspace_repository_id) {
    const { data: repo } = await supabase
      .from("workspace_repositories")
      .select("connected_by")
      .eq("id", figure.workspace_repository_id)
      .single();

    if (repo?.connected_by) {
      token = await getUserGitHubToken(supabase, repo.connected_by);
    }
  }
  token = token ?? env.GITHUB_SERVICE_TOKEN ?? null;

  if (!token) {
    await supabase
      .from("figures")
      .update({ status: "error", error_message: "No GitHub token available" })
      .eq("id", figureId);
    return Response.json({ error: "No GitHub token available" }, { status: 401 });
  }

  const workspaceId = (figure.documents as unknown as { workspace_id: string })?.workspace_id;
  if (!workspaceId) {
    await supabase
      .from("figures")
      .update({ status: "error", error_message: "Document has no workspace" })
      .eq("id", figureId);
    return Response.json({ error: "Document has no workspace" }, { status: 500 });
  }

  try {
    const rawUrl = getDrawioRawUrl(figure.github_repo, figure.github_path);
    const fileType = figure.file_type || "png";
    const isDrawio = fileType === "drawio";

    // 1. Download the file from GitHub
    const rawBuffer = await fetchImageBuffer(rawUrl, token);

    // 2. Convert drawio XML → PNG if needed
    let imageBuffer: Buffer;
    let storageFormat: string;
    if (isDrawio) {
      const xmlString = rawBuffer.toString("utf-8");
      imageBuffer = await convertDrawioToSvg(xmlString);
      // Export server produces PNG; Puppeteer fallback produces SVG
      storageFormat = env.DRAWIO_EXPORT_URL ? "png" : "svg";
    } else {
      imageBuffer = rawBuffer;
      storageFormat = fileType;
    }

    // 3. Upload to Supabase Storage
    const storagePath = `${workspaceId}/${figure.id}.${storageFormat}`;
    const contentType = CONTENT_TYPES[storageFormat] || "application/octet-stream";

    const { error: uploadError } = await supabase.storage
      .from("figures")
      .upload(storagePath, imageBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 4. Update the figure record with the storage path
    await supabase
      .from("figures")
      .update({
        cached_image_path: storagePath,
        cached_image_format: storageFormat,
        status: "active",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", figureId);

    // 5. Create a signed URL to return immediately
    const { data: urlData } = await supabase.storage
      .from("figures")
      .createSignedUrl(storagePath, 60 * 60);

    return Response.json({
      ok: true,
      cachedUrl: urlData?.signedUrl ?? null,
      cachedFormat: storageFormat,
      cachedImagePath: storagePath,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("figures")
      .update({ status: "error", error_message: message })
      .eq("id", figureId);
    return Response.json({ error: message }, { status: 500 });
  }
}
