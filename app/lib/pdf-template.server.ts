import katex from "katex";
import pdfCss from "../styles/pdf-export.css?raw";

// ---- Public API ----

export interface DocumentData {
  title: string;
  authors: string[];
  workspaceName: string;
  date: string;
  content: ProseMirrorNode;
}

export function renderDocumentToHtml(doc: DocumentData): string {
  const bodyHtml = renderContent(doc.content);
  const headings = collectHeadings(doc.content);
  const tocHtml = renderToc(headings);
  const footnoteHtml = renderFootnotes();

  // Reset footnotes for next call
  footnoteStore.length = 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(doc.title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.38/dist/katex.min.css" crossorigin="anonymous" />
  <style>${pdfCss}</style>
</head>
<body>

<!-- Running header strings (hidden, used by @page rules) -->
<span class="doc-title-string">${escapeHtml(doc.title)}</span>
<span class="doc-workspace-string">${escapeHtml(doc.workspaceName)}</span>

<!-- Front page -->
<div class="front-page">
  <h1>${escapeHtml(doc.title)}</h1>
  <div class="authors">${doc.authors.map(escapeHtml).join(", ") || "Unknown Author"}</div>
  <div class="workspace">${escapeHtml(doc.workspaceName)}</div>
  <div class="date">${escapeHtml(doc.date)}</div>
</div>

<!-- Table of contents -->
${tocHtml}

<!-- Document content -->
<main>
${bodyHtml}
</main>

${footnoteHtml}

</body>
</html>`;
}

// ---- ProseMirror JSON types (simplified) ----

interface ProseMirrorNode {
  type: string;
  content?: ProseMirrorNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: ProseMirrorMark[];
}

interface ProseMirrorMark {
  type: string;
  attrs?: Record<string, unknown>;
}

// ---- Footnote collection ----

const footnoteStore: string[] = [];

// ---- Node rendering ----

function renderContent(node: ProseMirrorNode): string {
  if (!node.content) return "";
  return node.content.map((child) => renderNode(child)).join("\n");
}

function renderNode(node: ProseMirrorNode): string {
  switch (node.type) {
    case "paragraph":
      return `<p>${renderInline(node)}</p>`;

    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      const tag = `h${Math.min(level, 6)}`;
      const text = getPlainText(node);
      const id = slugify(text);
      return `<${tag} id="${escapeAttr(id)}">${renderInline(node)}</${tag}>`;
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
      return `<div class="katex-display">${renderKatex(latex, true)}</div>`;
    }

    case "image":
    case "figure": {
      const src = (node.attrs?.src as string) ?? "";
      const alt = (node.attrs?.alt as string) ?? "";
      const caption = (node.attrs?.caption as string) ?? alt;
      return `<figure><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" />${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}</figure>`;
    }

    case "footnote": {
      const content = getPlainText(node) || (node.attrs?.content as string) || "";
      footnoteStore.push(content);
      const idx = footnoteStore.length;
      return `<sup class="footnote-ref"><a href="#fn-${idx}" id="fnref-${idx}">[${idx}]</a></sup>`;
    }

    case "hardBreak":
      return "<br />";

    case "doc":
      return renderContent(node);

    default:
      // Fallback: try rendering children
      if (node.content) return renderContent(node);
      if (node.text) return renderText(node);
      return "";
  }
}

function renderInline(node: ProseMirrorNode): string {
  if (!node.content) return "";
  return node.content.map((child) => renderText(child)).join("");
}

function renderText(node: ProseMirrorNode): string {
  if (node.type === "hardBreak") return "<br />";

  if (node.type === "math_inline" || node.type === "mathInline") {
    const latex = node.text || (node.attrs?.latex as string) || "";
    return renderKatex(latex, false);
  }

  if (node.type === "footnote") {
    const content = getPlainText(node) || (node.attrs?.content as string) || "";
    footnoteStore.push(content);
    const idx = footnoteStore.length;
    return `<sup class="footnote-ref"><a href="#fn-${idx}" id="fnref-${idx}">[${idx}]</a></sup>`;
  }

  if (!node.text) {
    // Non-text inline node; try to render children or as block
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
          const title = (mark.attrs?.title as string) ?? "";
          html = `<a href="${escapeAttr(href)}"${title ? ` title="${escapeAttr(title)}"` : ""}>${html}</a>`;
          break;
        }
        case "superscript":
          html = `<sup>${html}</sup>`;
          break;
        case "subscript":
          html = `<sub>${html}</sub>`;
          break;
      }
    }
  }

  return html;
}

// ---- Lists ----

function renderListItems(node: ProseMirrorNode): string {
  if (!node.content) return "";
  return node.content.map((child) => renderNode(child)).join("\n");
}

function renderListItemContent(node: ProseMirrorNode): string {
  if (!node.content) return "";
  // If a list item only contains a single paragraph, unwrap it for cleaner output
  if (
    node.content.length === 1 &&
    node.content[0].type === "paragraph"
  ) {
    return renderInline(node.content[0]);
  }
  return node.content.map((child) => renderNode(child)).join("\n");
}

// ---- Tables ----

function renderTable(node: ProseMirrorNode): string {
  if (!node.content) return "<table></table>";

  let html = "<figure class=\"table-figure\"><table>\n";
  let isFirstRow = true;

  for (const row of node.content) {
    if (row.type !== "tableRow") continue;

    const cells = row.content ?? [];
    const isHeader =
      isFirstRow && cells.every((c) => c.type === "tableHeader");

    if (isHeader) {
      html += "<thead><tr>";
      for (const cell of cells) {
        const colspan = (cell.attrs?.colspan as number) ?? 1;
        const rowspan = (cell.attrs?.rowspan as number) ?? 1;
        const attrs = buildSpanAttrs(colspan, rowspan);
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
        const attrs = buildSpanAttrs(colspan, rowspan);
        html += `<${tag}${attrs}>${renderCellContent(cell)}</${tag}>`;
      }
      html += "</tr>\n";
    }

    isFirstRow = false;
  }

  html += "</tbody>\n</table></figure>";
  return html;
}

function buildSpanAttrs(colspan: number, rowspan: number): string {
  let s = "";
  if (colspan > 1) s += ` colspan="${colspan}"`;
  if (rowspan > 1) s += ` rowspan="${rowspan}"`;
  return s;
}

function renderCellContent(cell: ProseMirrorNode): string {
  if (!cell.content) return "";
  // Unwrap single paragraph inside cell
  if (cell.content.length === 1 && cell.content[0].type === "paragraph") {
    return renderInline(cell.content[0]);
  }
  return cell.content.map((child) => renderNode(child)).join("");
}

// ---- Table of contents ----

interface Heading {
  level: number;
  text: string;
  id: string;
}

function collectHeadings(node: ProseMirrorNode): Heading[] {
  const headings: Heading[] = [];
  walkNodes(node, (n) => {
    if (n.type === "heading") {
      const level = (n.attrs?.level as number) ?? 1;
      const text = getPlainText(n);
      headings.push({ level, text, id: slugify(text) });
    }
  });
  return headings;
}

function renderToc(headings: Heading[]): string {
  if (headings.length === 0) return "";

  let html = '<div class="toc">\n<h2>Table of Contents</h2>\n<ul>\n';
  for (const h of headings) {
    if (h.level > 3) continue;
    html += `  <li class="toc-h${h.level}"><a href="#${escapeAttr(h.id)}">${escapeHtml(h.text)}</a></li>\n`;
  }
  html += "</ul>\n</div>";
  return html;
}

// ---- Footnotes ----

function renderFootnotes(): string {
  if (footnoteStore.length === 0) return "";

  let html =
    '<div class="footnotes">\n<h2>Notes</h2>\n<ol>\n';
  for (let i = 0; i < footnoteStore.length; i++) {
    const idx = i + 1;
    html += `  <li id="fn-${idx}">${escapeHtml(footnoteStore[i])} <a href="#fnref-${idx}">\u21A9</a></li>\n`;
  }
  html += "</ol>\n</div>";
  return html;
}

// ---- KaTeX rendering ----

function renderKatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: "html",
    });
  } catch {
    return `<code class="katex-error">${escapeHtml(latex)}</code>`;
  }
}

// ---- Utilities ----

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

function getPlainText(node: ProseMirrorNode): string {
  if (node.text) return node.text;
  if (!node.content) return "";
  return node.content.map(getPlainText).join("");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function walkNodes(
  node: ProseMirrorNode,
  visitor: (n: ProseMirrorNode) => void,
): void {
  visitor(node);
  if (node.content) {
    for (const child of node.content) {
      walkNodes(child, visitor);
    }
  }
}
