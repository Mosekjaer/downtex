import type { LoaderFunctionArgs } from "react-router";
import { createServiceRoleClient } from "~/lib/supabase.server";
import { renderDocumentToHtml } from "~/lib/pdf-template.server";

// ---- One-time token store with TTL ----

interface TokenEntry {
  docId: string;
  content: unknown;
  title: string;
  authors: string[];
  workspaceName: string;
  expiresAt: number;
}

const tokenStore = new Map<string, TokenEntry>();

const TOKEN_TTL_MS = 60_000; // 60 seconds

/** Register a one-time render token. Returns the token string. */
export function createRenderToken(entry: Omit<TokenEntry, "expiresAt">): string {
  // Clean up expired tokens opportunistically
  const now = Date.now();
  for (const [key, val] of tokenStore) {
    if (val.expiresAt <= now) tokenStore.delete(key);
  }

  const token = crypto.randomUUID();
  tokenStore.set(token, { ...entry, expiresAt: now + TOKEN_TTL_MS });
  return token;
}

// ---- Loader: serves the HTML render page ----

export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const docId = params.docId ?? "";

  if (!token) {
    throw new Response("Missing token", { status: 400 });
  }

  // Validate token
  const entry = tokenStore.get(token);
  if (!entry) {
    throw new Response("Invalid or expired token", { status: 403 });
  }

  // Consume the token (one-time use)
  tokenStore.delete(token);

  // Check expiry
  if (Date.now() > entry.expiresAt) {
    throw new Response("Token expired", { status: 403 });
  }

  // Ensure token is for this document
  if (entry.docId !== docId) {
    throw new Response("Token/document mismatch", { status: 403 });
  }

  // If we have pre-built content from the token, use it directly
  if (entry.content) {
    const html = renderDocumentToHtml({
      title: entry.title,
      authors: entry.authors,
      workspaceName: entry.workspaceName,
      date: new Date().toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      content: entry.content as Parameters<typeof renderDocumentToHtml>[0]["content"],
    });

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Fallback: fetch from Supabase using service role (internal render)
  const supabase = createServiceRoleClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, workspace_id")
    .eq("id", docId)
    .single();

  if (!doc) {
    throw new Response("Document not found", { status: 404 });
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", doc.workspace_id)
    .single();

  const html = renderDocumentToHtml({
    title: doc.title ?? "Untitled",
    authors: entry.authors,
    workspaceName: workspace?.name ?? "",
    date: new Date().toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    content: { type: "doc", content: [] },
  });

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
