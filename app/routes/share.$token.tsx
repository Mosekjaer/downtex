import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { useLoaderData } from "react-router";
import * as Y from "yjs";
import { createServiceRoleClient } from "~/lib/supabase.server";

// ---- Yjs XML Fragment → ProseMirror JSON (same as export route) ----

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
          marks.push({ type: key, attrs: { href: value } });
        }
      }
      if (marks.length > 0) node.marks = marks;
    }
    nodes.push(node);
  }
  return nodes;
}

// ---- ProseMirror JSON → HTML ----

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(str: string): string {
  return escapeHtml(str);
}

function getPlainText(node: PMNode): string {
  if (node.text) return node.text;
  if (!node.content) return "";
  return node.content.map(getPlainText).join("");
}

function renderContent(node: PMNode): string {
  if (!node.content) return "";
  return node.content.map(renderNode).join("\n");
}

function renderNode(node: PMNode): string {
  switch (node.type) {
    case "paragraph":
      return `<p>${renderInline(node)}</p>`;

    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      const tag = `h${Math.min(level, 6)}`;
      return `<${tag}>${renderInline(node)}</${tag}>`;
    }

    case "bulletList":
      return `<ul>${renderListItems(node)}</ul>`;

    case "orderedList": {
      const start = (node.attrs?.start as number) ?? 1;
      return `<ol start="${start}">${renderListItems(node)}</ol>`;
    }

    case "listItem":
      return `<li>${renderListItemContent(node)}</li>`;

    case "codeBlock": {
      const lang = (node.attrs?.language as string) ?? "";
      const code = getPlainText(node);
      return `<pre><code${lang ? ` class="language-${escapeAttr(lang)}"` : ""}>${escapeHtml(code)}</code></pre>`;
    }

    case "blockquote":
      return `<blockquote>${renderContent(node)}</blockquote>`;

    case "horizontalRule":
      return "<hr />";

    case "table":
      return renderTable(node);

    case "math_display":
    case "mathBlock": {
      const latex = getPlainText(node) || (node.attrs?.latex as string) || "";
      return `<div class="math-display"><code>${escapeHtml(latex)}</code></div>`;
    }

    case "hardBreak":
      return "<br />";

    case "doc":
      return renderContent(node);

    default:
      if (node.content) return renderContent(node);
      if (node.text) return renderText(node);
      return "";
  }
}

function renderInline(node: PMNode): string {
  if (!node.content) return "";
  return node.content.map(renderText).join("");
}

function renderText(node: PMNode): string {
  if (node.type === "hardBreak") return "<br />";

  if (node.type === "math_inline" || node.type === "mathInline") {
    const latex = node.text || (node.attrs?.latex as string) || "";
    return `<code class="math-inline">${escapeHtml(latex)}</code>`;
  }

  if (!node.text) {
    if (node.content) return renderInline(node);
    return renderNode(node);
  }

  let html = escapeHtml(node.text);

  if (node.marks) {
    for (const mark of node.marks) {
      switch (mark.type) {
        case "bold":
        case "strong":
          html = `<strong>${html}</strong>`;
          break;
        case "italic":
        case "em":
          html = `<em>${html}</em>`;
          break;
        case "underline":
          html = `<u>${html}</u>`;
          break;
        case "strike":
        case "strikethrough":
          html = `<s>${html}</s>`;
          break;
        case "code":
          html = `<code>${html}</code>`;
          break;
        case "link": {
          const href = (mark.attrs?.href as string) ?? "#";
          html = `<a href="${escapeAttr(href)}">${html}</a>`;
          break;
        }
      }
    }
  }

  return html;
}

function renderListItems(node: PMNode): string {
  if (!node.content) return "";
  return node.content.map(renderNode).join("\n");
}

function renderListItemContent(node: PMNode): string {
  if (!node.content) return "";
  if (node.content.length === 1 && node.content[0].type === "paragraph") {
    return renderInline(node.content[0]);
  }
  return node.content.map(renderNode).join("\n");
}

function renderTable(node: PMNode): string {
  if (!node.content) return "<table></table>";
  let html = "<table>\n";
  let isFirstRow = true;

  for (const row of node.content) {
    if (row.type !== "tableRow") continue;
    const cells = row.content ?? [];
    const isHeader = isFirstRow && cells.every((c) => c.type === "tableHeader");

    if (isHeader) {
      html += "<thead><tr>";
      for (const cell of cells) {
        const colspan = (cell.attrs?.colspan as number) ?? 1;
        const rowspan = (cell.attrs?.rowspan as number) ?? 1;
        let attrs = "";
        if (colspan > 1) attrs += ` colspan="${colspan}"`;
        if (rowspan > 1) attrs += ` rowspan="${rowspan}"`;
        html += `<th${attrs}>${renderCellContent(cell)}</th>`;
      }
      html += "</tr></thead>\n<tbody>\n";
    } else {
      if (isFirstRow) html += "<tbody>\n";
      html += "<tr>";
      for (const cell of cells) {
        const tag = cell.type === "tableHeader" ? "th" : "td";
        const colspan = (cell.attrs?.colspan as number) ?? 1;
        const rowspan = (cell.attrs?.rowspan as number) ?? 1;
        let attrs = "";
        if (colspan > 1) attrs += ` colspan="${colspan}"`;
        if (rowspan > 1) attrs += ` rowspan="${rowspan}"`;
        html += `<${tag}${attrs}>${renderCellContent(cell)}</${tag}>`;
      }
      html += "</tr>\n";
    }
    isFirstRow = false;
  }

  html += "</tbody>\n</table>";
  return html;
}

function renderCellContent(cell: PMNode): string {
  if (!cell.content) return "";
  if (cell.content.length === 1 && cell.content[0].type === "paragraph") {
    return renderInline(cell.content[0]);
  }
  return cell.content.map(renderNode).join("");
}

// ---- Convert Yjs state to HTML on the server ----

function yjsStateToHtml(yjsState: Buffer | Uint8Array): string {
  const ydoc = new Y.Doc();
  const binary =
    yjsState instanceof Uint8Array ? yjsState : new Uint8Array(Buffer.from(yjsState));
  Y.applyUpdate(ydoc, binary);
  const fragment = ydoc.getXmlFragment("default");
  const json = xmlFragmentToJson(fragment);
  return renderContent(json);
}

// ---- Route ----

export async function loader({ params }: LoaderFunctionArgs) {
  const token = params.token!;
  const supabase = createServiceRoleClient();

  const { data: link } = await supabase
    .from("document_public_links")
    .select("document_id")
    .eq("token", token)
    .single();

  if (!link) {
    throw new Response("This link is invalid or has been disabled.", { status: 404 });
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, yjs_state")
    .eq("id", link.document_id)
    .single();

  if (!doc) {
    throw new Response("Document not found.", { status: 404 });
  }

  let contentHtml = "";
  if (doc.yjs_state) {
    contentHtml = yjsStateToHtml(doc.yjs_state);
  }

  return {
    title: doc.title,
    contentHtml,
    isEmpty: !doc.yjs_state,
  };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const title = data?.title ?? "Shared Document";
  return [
    { title: `${title} — Downtex` },
    { name: "robots", content: "noindex" },
  ];
};

export default function SharedDocumentPage() {
  const { title, contentHtml, isEmpty } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-200 px-6 py-4">
        <div className="mx-auto" style={{ maxWidth: 680 }}>
          <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            Shared document &mdash; read only
          </p>
        </div>
      </header>
      <main
        className="prose prose-zinc mx-auto px-6 py-8"
        style={{ maxWidth: 680, fontFamily: "Georgia, serif" }}
      >
        {isEmpty ? (
          <p className="py-20 text-center text-sm text-zinc-400">
            This document is empty.
          </p>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
        )}
      </main>
    </div>
  );
}
