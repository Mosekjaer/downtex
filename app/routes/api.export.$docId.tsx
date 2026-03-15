import type { ActionFunctionArgs } from "react-router";
import * as Y from "yjs";
import { requireAuth } from "~/lib/supabase.server";
import { getUserDocumentRole, requireRole } from "~/lib/permissions.server";
import { renderDocumentToHtml } from "~/lib/pdf-template.server";
import { generatePdf } from "~/lib/pdf.server";
import type { ReferenceSource, DocumentLayoutSettings } from "~/lib/citation-formatters";
import { DEFAULT_SETTINGS } from "~/lib/citation-formatters";

// ---- Yjs XML Fragment → ProseMirror JSON ----

interface PMNode {
  type: string;
  content?: PMNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

function xmlFragmentToJson(fragment: Y.XmlFragment): PMNode {
  const children: PMNode[] = [];

  fragment.forEach((item) => {
    const node = xmlElementToJson(item);
    if (node) children.push(node);
  });

  return { type: "doc", content: children };
}

function xmlElementToJson(element: Y.XmlElement | Y.XmlText): PMNode | null {
  if (element instanceof Y.XmlText) {
    const delta = element.toDelta();
    // Return a virtual paragraph wrapping text deltas
    const inlineNodes = deltaToInlineNodes(delta);
    if (inlineNodes.length === 0) return null;
    return { type: "paragraph", content: inlineNodes };
  }

  const nodeName = element.nodeName;
  const attrs: Record<string, unknown> = {};
  const elementAttrs = element.getAttributes();

  for (const [key, value] of Object.entries(elementAttrs)) {
    attrs[key] = value;
  }

  const children: PMNode[] = [];
  element.forEach((child) => {
    if (child instanceof Y.XmlText) {
      const delta = child.toDelta();
      const inlineNodes = deltaToInlineNodes(delta);
      children.push(...inlineNodes);
    } else {
      const childNode = xmlElementToJson(child);
      if (childNode) children.push(childNode);
    }
  });

  const node: PMNode = { type: nodeName };
  if (Object.keys(attrs).length > 0) node.attrs = attrs;
  if (children.length > 0) node.content = children;

  return node;
}

function deltaToInlineNodes(
  delta: Array<{ insert: string; attributes?: Record<string, unknown> }>,
): PMNode[] {
  const nodes: PMNode[] = [];

  for (const op of delta) {
    if (typeof op.insert !== "string") continue;

    const node: PMNode = { type: "text", text: op.insert };

    if (op.attributes) {
      const marks: Array<{ type: string; attrs?: Record<string, unknown> }> = [];
      for (const [key, value] of Object.entries(op.attributes)) {
        if (value === true) {
          marks.push({ type: key });
        } else if (typeof value === "object" && value !== null) {
          marks.push({ type: key, attrs: value as Record<string, unknown> });
        } else if (typeof value === "string") {
          // e.g. link with href stored as string value
          marks.push({ type: key, attrs: { href: value } });
        }
      }
      if (marks.length > 0) node.marks = marks;
    }

    nodes.push(node);
  }

  return nodes;
}

// ---- Action: POST /api/export/:docId ----

export async function action({ request, params }: ActionFunctionArgs) {
  const { supabase, user } = await requireAuth(request);
  const documentId = params.docId ?? "";

  // 1. Auth + role check (editor or above)
  const role = await getUserDocumentRole(supabase, documentId, user.id);
  requireRole(role, "editor");

  // 2. Fetch document
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, title, yjs_state, workspace_id")
    .eq("id", documentId)
    .single();

  if (docError || !doc) {
    throw new Response("Document not found", { status: 404 });
  }

  // 3. Fetch workspace
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", doc.workspace_id)
    .single();

  // 4. Fetch collaborators with editor+ role as authors
  const { data: collaborators } = await supabase
    .from("document_members")
    .select("user_id, role, profiles(display_name, email)")
    .eq("document_id", documentId)
    .in("role", ["owner", "editor"]);

  const authors: string[] = (collaborators ?? []).map((c) => {
    const profile = c.profiles as unknown as { display_name?: string; email?: string } | null;
    return profile?.display_name || profile?.email || "Unknown";
  });

  if (authors.length === 0) {
    authors.push("Unknown Author");
  }

  // 5. Decode Yjs state to ProseMirror JSON + extract references & settings
  let content: PMNode = { type: "doc", content: [] };
  let references: Record<string, ReferenceSource> = {};
  let settings: DocumentLayoutSettings = { ...DEFAULT_SETTINGS };

  if (doc.yjs_state) {
    try {
      const ydoc = new Y.Doc();
      const stateBuffer =
        doc.yjs_state instanceof Uint8Array
          ? doc.yjs_state
          : new Uint8Array(Buffer.from(doc.yjs_state));
      Y.applyUpdate(ydoc, stateBuffer);

      // TipTap uses "default" as the fragment name by default
      const fragment = ydoc.getXmlFragment("default");
      content = xmlFragmentToJson(fragment);

      // Extract references map
      const refsMap = ydoc.getMap("references");
      refsMap.forEach((value, key) => {
        references[key] = value as ReferenceSource;
      });

      // Extract document layout settings
      const settingsMap = ydoc.getMap("docSettings");
      for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof DocumentLayoutSettings)[]) {
        const val = settingsMap.get(key);
        if (val !== undefined) {
          (settings as unknown as Record<string, unknown>)[key] = val;
        }
      }

      ydoc.destroy();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to decode Yjs state:", err);
      // Continue with empty content
    }
  }

  // 6. Render HTML
  const title = doc.title || "Untitled";
  const html = renderDocumentToHtml({
    title,
    authors,
    workspaceName: workspace?.name ?? "",
    date: new Date().toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    content,
    references,
    settings,
  });

  // 7. Generate PDF
  const pdfBuffer = await generatePdf(html, settings);

  // 8. Return PDF response
  const safeFilename = title.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "document";

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFilename}.pdf"`,
      "Content-Length": String(pdfBuffer.byteLength),
    },
  });
}
