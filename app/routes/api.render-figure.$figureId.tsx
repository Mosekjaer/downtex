import type { ActionFunctionArgs } from "react-router";
import { createServiceRoleClient } from "~/lib/supabase.server";
import { getFileContent, getFileContentRaw, getUserGitHubToken } from "~/lib/github.server";
import { convertDrawioToSvg } from "~/lib/drawio.server";
import { env } from "~/lib/env.server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function action({ request, params }: ActionFunctionArgs) {
  const figureId = params.figureId ?? "";

  // Accept either service-role key or user auth
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

  const workspaceId = (figure.documents as unknown as { workspace_id: string })?.workspace_id;
  if (!workspaceId) {
    return Response.json({ error: "Document workspace not found" }, { status: 404 });
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

  try {
    let imageBuffer: Buffer;
    let format: string;

    if (figure.file_type === "drawio") {
      // Fetch .drawio XML and convert to SVG
      const drawioXml = await getFileContent(token, figure.github_repo, figure.github_path);
      imageBuffer = await convertDrawioToSvg(drawioXml);
      format = "svg";
    } else {
      // Fetch raw image
      imageBuffer = await getFileContentRaw(token, figure.github_repo, figure.github_path);
      format = figure.file_type || "png";
    }

    // Check file size
    if (imageBuffer.length > MAX_FILE_SIZE) {
      await supabase
        .from("figures")
        .update({ status: "error", error_message: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` })
        .eq("id", figureId);
      return Response.json({ error: "File too large" }, { status: 413 });
    }

    // Upload to Supabase Storage
    const storagePath = `${workspaceId}/${figureId}.${format === "svg" ? "svg" : format}`;
    const contentType =
      format === "svg"
        ? "image/svg+xml"
        : format === "png"
          ? "image/png"
          : format === "gif"
            ? "image/gif"
            : "image/jpeg";

    const { error: uploadError } = await supabase.storage
      .from("figures")
      .upload(storagePath, imageBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      await supabase
        .from("figures")
        .update({ status: "error", error_message: uploadError.message })
        .eq("id", figureId);
      return Response.json({ error: uploadError.message }, { status: 500 });
    }

    // Get a signed URL (valid for 1 year)
    const { data: urlData } = await supabase.storage
      .from("figures")
      .createSignedUrl(storagePath, 365 * 24 * 60 * 60);

    const cachedUrl = urlData?.signedUrl ?? null;

    // Update figure record
    await supabase
      .from("figures")
      .update({
        cached_image_path: storagePath,
        cached_image_format: format === "svg" ? "svg" : format,
        status: "active",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", figureId);

    return Response.json({ ok: true, cachedImagePath: storagePath, cachedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("figures")
      .update({ status: "error", error_message: message })
      .eq("id", figureId);
    return Response.json({ error: message }, { status: 500 });
  }
}
