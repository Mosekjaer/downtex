import katex from "katex";
import pdfCss from "../styles/pdf-export.css?raw";

// ---- PDF-embedded styles ----

const pdfFontFaces = `
@font-face { font-family: "Inter"; font-weight: 400; src: url("/fonts/inter/400-normal.woff2") format("woff2"); }
@font-face { font-family: "Inter"; font-weight: 700; src: url("/fonts/inter/700-normal.woff2") format("woff2"); }
@font-face { font-family: "Inter"; font-style: italic; font-weight: 400; src: url("/fonts/inter/400-italic.woff2") format("woff2"); }
@font-face { font-family: "Merriweather"; font-weight: 400; src: url("/fonts/merriweather/400-normal.woff2") format("woff2"); }
@font-face { font-family: "Merriweather"; font-weight: 700; src: url("/fonts/merriweather/700-normal.woff2") format("woff2"); }
@font-face { font-family: "Merriweather"; font-style: italic; font-weight: 400; src: url("/fonts/merriweather/400-italic.woff2") format("woff2"); }
@font-face { font-family: "Open Sans"; font-weight: 400; src: url("/fonts/open-sans/400-normal.woff2") format("woff2"); }
@font-face { font-family: "Open Sans"; font-weight: 700; src: url("/fonts/open-sans/700-normal.woff2") format("woff2"); }
@font-face { font-family: "Open Sans"; font-style: italic; font-weight: 400; src: url("/fonts/open-sans/400-italic.woff2") format("woff2"); }
@font-face { font-family: "Roboto"; font-weight: 400; src: url("/fonts/roboto/400-normal.woff2") format("woff2"); }
@font-face { font-family: "Roboto"; font-weight: 700; src: url("/fonts/roboto/700-normal.woff2") format("woff2"); }
@font-face { font-family: "Roboto"; font-style: italic; font-weight: 400; src: url("/fonts/roboto/400-italic.woff2") format("woff2"); }
@font-face { font-family: "Playfair Display"; font-weight: 400; src: url("/fonts/playfair-display/400-normal.woff2") format("woff2"); }
@font-face { font-family: "Playfair Display"; font-weight: 700; src: url("/fonts/playfair-display/700-normal.woff2") format("woff2"); }
@font-face { font-family: "Playfair Display"; font-style: italic; font-weight: 400; src: url("/fonts/playfair-display/400-italic.woff2") format("woff2"); }
@font-face { font-family: "Lora"; font-weight: 400; src: url("/fonts/lora/400-normal.woff2") format("woff2"); }
@font-face { font-family: "Lora"; font-weight: 700; src: url("/fonts/lora/700-normal.woff2") format("woff2"); }
@font-face { font-family: "Lora"; font-style: italic; font-weight: 400; src: url("/fonts/lora/400-italic.woff2") format("woff2"); }
@font-face { font-family: "JetBrains Mono"; font-weight: 400; src: url("/fonts/jetbrains-mono/400-normal.woff2") format("woff2"); }
@font-face { font-family: "JetBrains Mono"; font-weight: 700; src: url("/fonts/jetbrains-mono/700-normal.woff2") format("woff2"); }
@font-face { font-family: "Fira Code"; font-weight: 400; src: url("/fonts/fira-code/400-normal.woff2") format("woff2"); }
@font-face { font-family: "Fira Code"; font-weight: 700; src: url("/fonts/fira-code/700-normal.woff2") format("woff2"); }
`;

const pdfTableStyles = `
table.table-style-minimal th, table.table-style-minimal td { border: none; background: transparent; }
table.table-style-minimal th { font-weight: 600; border-bottom: 2px solid #27272a; padding-bottom: 0.5em; }
table.table-style-minimal td { border-bottom: 1px solid #f4f4f5; }
table.table-style-minimal tbody tr:last-child td { border-bottom: none; }
table.table-style-elegant { border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden; }
table.table-style-elegant th, table.table-style-elegant td { border: none; border-bottom: 1px solid #e4e4e7; }
table.table-style-elegant th { background: #fafaf9; font-weight: 600; color: #3f3f46; }
table.table-style-elegant td { background: white; }
table.table-style-elegant tbody tr:last-child td { border-bottom: none; }
table.table-style-striped th, table.table-style-striped td { border: none; border-bottom: 1px solid #e4e4e7; }
table.table-style-striped th { background: #27272a; color: #fafafa; font-weight: 600; }
table.table-style-striped td { background: white; }
table.table-style-striped tbody tr:nth-child(odd) td { background: #fafafa; }
table.table-style-research { border-top: 2px solid #18181b; border-bottom: 2px solid #18181b; }
table.table-style-research th, table.table-style-research td { border: none; background: transparent; padding: 0.45em 0.7em; }
table.table-style-research th { font-weight: 600; border-bottom: 1px solid #18181b; }
table.table-style-research td { border-bottom: 1px solid #e4e4e7; }
table.table-style-research tbody tr:last-child td { border-bottom: none; }
mark { padding: 0.1em 0.2em; border-radius: 2px; }
`;

// ---- Public API ----

export interface DocumentData {
  title: string;
  authors: string[];
  workspaceName: string;
  date: string;
  content: ProseMirrorNode;
}

// ---- Figure numbering state ----

let figureCounter = 0;
const figureNumberMap = new Map<string, number>();

export function renderDocumentToHtml(doc: DocumentData): string {
  // Reset figure counter for this document
  figureCounter = 0;
  figureNumberMap.clear();
  // Pre-scan to build figure number map
  walkNodes(doc.content, (n) => {
    if (n.type === "figure") {
      figureCounter++;
      const id = n.attrs?.figureId as string;
      if (id) figureNumberMap.set(id, figureCounter);
    }
  });
  figureCounter = 0; // Reset for rendering pass

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
  <style>${pdfFontFaces}${pdfTableStyles}${pdfCss}</style>
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

// ---- Style helpers ----

function buildBlockStyle(node: ProseMirrorNode): string {
  const styles: string[] = [];
  const textAlign = node.attrs?.textAlign as string | undefined;
  if (textAlign && textAlign !== "left") styles.push(`text-align: ${textAlign}`);
  const marginTop = node.attrs?.marginTop as string | undefined;
  if (marginTop) styles.push(`margin-top: ${marginTop}`);
  const marginBottom = node.attrs?.marginBottom as string | undefined;
  if (marginBottom) styles.push(`margin-bottom: ${marginBottom}`);
  const indent = node.attrs?.indent as number | undefined;
  if (indent && indent > 0) styles.push(`padding-left: ${indent * 2}em`);
  if (styles.length === 0) return "";
  return ` style="${styles.join("; ")}"`;
}

function buildTextStyleSpan(html: string, mark: ProseMirrorMark): string {
  const styles: string[] = [];
  const attrs = mark.attrs ?? {};
  if (attrs.fontFamily) styles.push(`font-family: ${attrs.fontFamily as string}`);
  if (attrs.fontSize) styles.push(`font-size: ${attrs.fontSize as string}`);
  if (attrs.color) styles.push(`color: ${attrs.color as string}`);
  if (attrs.letterSpacing) styles.push(`letter-spacing: ${attrs.letterSpacing as string}`);
  if (attrs.lineHeight) styles.push(`line-height: ${attrs.lineHeight as string}`);
  if (styles.length === 0) return html;
  return `<span style="${styles.join("; ")}">${html}</span>`;
}

// ---- Node rendering ----

function renderContent(node: ProseMirrorNode): string {
  if (!node.content) return "";
  return node.content.map((child) => renderNode(child)).join("\n");
}

function renderNode(node: ProseMirrorNode): string {
  switch (node.type) {
    case "paragraph": {
      const pStyle = buildBlockStyle(node);
      return `<p${pStyle}>${renderInline(node)}</p>`;
    }

    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      const tag = `h${Math.min(level, 6)}`;
      const text = getPlainText(node);
      const id = slugify(text);
      const hStyle = buildBlockStyle(node);
      return `<${tag} id="${escapeAttr(id)}"${hStyle}>${renderInline(node)}</${tag}>`;
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

    case "image": {
      const src = (node.attrs?.src as string) ?? "";
      const alt = (node.attrs?.alt as string) ?? "";
      return `<figure><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" />${alt ? `<figcaption>${escapeHtml(alt)}</figcaption>` : ""}</figure>`;
    }

    case "figure": {
      figureCounter++;
      const figSrc =
        (node.attrs?.svgUrl as string) ||
        (node.attrs?.imageUrl as string) ||
        (node.attrs?.src as string) ||
        "";
      const figAlt = (node.attrs?.caption as string) || "Figure";
      const figCaption = node.content
        ? node.content.map(getPlainText).join("")
        : ((node.attrs?.caption as string) ?? "");
      const figPrefix = `Figur ${figureCounter}`;
      const captionText = figCaption ? `${figPrefix}: ${escapeHtml(figCaption)}` : figPrefix;
      return `<figure class="drawio-figure">${figSrc ? `<img src="${escapeAttr(figSrc)}" alt="${escapeAttr(figAlt)}" style="max-width:100%;height:auto;" />` : ""}<figcaption>${captionText}</figcaption></figure>`;
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

  if (node.type === "figureReference") {
    const targetId = (node.attrs?.targetFigureId as string) ?? "";
    const num = figureNumberMap.get(targetId);
    return `<span class="figure-ref">${num ? `Figur ${num}` : "Figur ?"}</span>`;
  }

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
        case "textStyle":
          html = buildTextStyleSpan(html, mark);
          break;
        case "highlight": {
          const hlColor = (mark.attrs?.color as string) ?? "#ffeb3b";
          html = `<mark style="background-color: ${hlColor}">${html}</mark>`;
          break;
        }
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
  if (node.content.length === 1 && node.content[0].type === "paragraph") {
    return renderInline(node.content[0]);
  }
  return node.content.map((child) => renderNode(child)).join("\n");
}

// ---- Tables ----

function renderTable(node: ProseMirrorNode): string {
  if (!node.content) return "<table></table>";

  const tableStyle = (node.attrs?.tableStyle as string) ?? "default";
  const tableClass =
    tableStyle !== "default" ? ` class="table-style-${escapeAttr(tableStyle)}"` : "";
  let html = `<figure class="table-figure"><table${tableClass}>\n`;
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
        const attrs = buildCellAttrs(colspan, rowspan, cell);
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
        const attrs = buildCellAttrs(colspan, rowspan, cell);
        html += `<${tag}${attrs}>${renderCellContent(cell)}</${tag}>`;
      }
      html += "</tr>\n";
    }

    isFirstRow = false;
  }

  html += "</tbody>\n</table></figure>";
  return html;
}

function buildCellAttrs(colspan: number, rowspan: number, cell: ProseMirrorNode): string {
  let s = "";
  if (colspan > 1) s += ` colspan="${colspan}"`;
  if (rowspan > 1) s += ` rowspan="${rowspan}"`;
  const bg = cell.attrs?.backgroundColor as string | undefined;
  if (bg) s += ` style="background-color: ${bg}"`;
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

  let html = '<div class="footnotes">\n<h2>Notes</h2>\n<ol>\n';
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

function walkNodes(node: ProseMirrorNode, visitor: (n: ProseMirrorNode) => void): void {
  visitor(node);
  if (node.content) {
    for (const child of node.content) {
      walkNodes(child, visitor);
    }
  }
}
