import { describe, it, expect, vi } from "vitest";

// Mock katex
vi.mock("katex", () => ({
  default: {
    renderToString: (latex: string, _opts: unknown) =>
      `<span class="katex">${latex}</span>`,
  },
}));

// Mock the CSS import
vi.mock("../../app/styles/pdf-export.css?raw", () => ({
  default: "/* mocked css */",
}));

import { renderDocumentToHtml, type DocumentData } from "~/lib/pdf-template.server";

function makeDoc(content: DocumentData["content"]): DocumentData {
  return {
    title: "Test Doc",
    authors: ["Alice", "Bob"],
    workspaceName: "Test Workspace",
    date: "2025-01-01",
    content,
  };
}

describe("pdf-template", () => {
  describe("heading numbering / rendering", () => {
    it("renders h1 headings with correct tag and id", () => {
      const html = renderDocumentToHtml(
        makeDoc({
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: "Introduction" }],
            },
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: "Methods" }],
            },
          ],
        }),
      );

      expect(html).toContain('<h1 id="introduction">Introduction</h1>');
      expect(html).toContain('<h1 id="methods">Methods</h1>');
    });

    it("renders h2 and h3 headings", () => {
      const html = renderDocumentToHtml(
        makeDoc({
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: "Chapter" }],
            },
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Section" }],
            },
            {
              type: "heading",
              attrs: { level: 3 },
              content: [{ type: "text", text: "Subsection" }],
            },
          ],
        }),
      );

      expect(html).toContain('<h1 id="chapter">Chapter</h1>');
      expect(html).toContain('<h2 id="section">Section</h2>');
      expect(html).toContain('<h3 id="subsection">Subsection</h3>');
    });

    it("includes headings in table of contents", () => {
      const html = renderDocumentToHtml(
        makeDoc({
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: "First" }],
            },
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Second" }],
            },
          ],
        }),
      );

      expect(html).toContain('class="toc"');
      expect(html).toContain('class="toc-h1"');
      expect(html).toContain('class="toc-h2"');
      expect(html).toContain('<a href="#first">First</a>');
      expect(html).toContain('<a href="#second">Second</a>');
    });
  });

  describe("paragraph rendering", () => {
    it("renders a simple paragraph", () => {
      const html = renderDocumentToHtml(
        makeDoc({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Hello world" }],
            },
          ],
        }),
      );

      expect(html).toContain("<p>Hello world</p>");
    });

    it("renders paragraph with bold and italic marks", () => {
      const html = renderDocumentToHtml(
        makeDoc({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "bold",
                  marks: [{ type: "bold" }],
                },
                { type: "text", text: " and " },
                {
                  type: "text",
                  text: "italic",
                  marks: [{ type: "italic" }],
                },
              ],
            },
          ],
        }),
      );

      expect(html).toContain("<strong>bold</strong>");
      expect(html).toContain("<em>italic</em>");
    });

    it("escapes HTML in text", () => {
      const html = renderDocumentToHtml(
        makeDoc({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "<script>alert('xss')</script>" }],
            },
          ],
        }),
      );

      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });
  });

  describe("code block rendering", () => {
    it("renders a code block with language", () => {
      const html = renderDocumentToHtml(
        makeDoc({
          type: "doc",
          content: [
            {
              type: "codeBlock",
              attrs: { language: "typescript" },
              content: [{ type: "text", text: 'const x = 1;' }],
            },
          ],
        }),
      );

      expect(html).toContain('<pre><code class="language-typescript">');
      expect(html).toContain("const x = 1;");
      expect(html).toContain("</code></pre>");
    });

    it("renders a code block without language", () => {
      const html = renderDocumentToHtml(
        makeDoc({
          type: "doc",
          content: [
            {
              type: "codeBlock",
              content: [{ type: "text", text: "plain code" }],
            },
          ],
        }),
      );

      expect(html).toContain("<pre><code>plain code</code></pre>");
    });
  });

  describe("list rendering", () => {
    it("renders a bullet list", () => {
      const html = renderDocumentToHtml(
        makeDoc({
          type: "doc",
          content: [
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Item A" }],
                    },
                  ],
                },
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Item B" }],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      );

      expect(html).toContain("<ul>");
      expect(html).toContain("<li>Item A</li>");
      expect(html).toContain("<li>Item B</li>");
      expect(html).toContain("</ul>");
    });

    it("renders an ordered list with start attribute", () => {
      const html = renderDocumentToHtml(
        makeDoc({
          type: "doc",
          content: [
            {
              type: "orderedList",
              attrs: { start: 3 },
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Third" }],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      );

      expect(html).toContain('<ol start="3">');
      expect(html).toContain("<li>Third</li>");
    });
  });

  describe("table rendering", () => {
    it("renders a table with header row", () => {
      const html = renderDocumentToHtml(
        makeDoc({
          type: "doc",
          content: [
            {
              type: "table",
              content: [
                {
                  type: "tableRow",
                  content: [
                    {
                      type: "tableHeader",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Name" }],
                        },
                      ],
                    },
                    {
                      type: "tableHeader",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Value" }],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "tableRow",
                  content: [
                    {
                      type: "tableCell",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "foo" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "bar" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      );

      expect(html).toContain("<thead>");
      expect(html).toContain("<th>Name</th>");
      expect(html).toContain("<th>Value</th>");
      expect(html).toContain("</thead>");
      expect(html).toContain("<tbody>");
      expect(html).toContain("<td>foo</td>");
      expect(html).toContain("<td>bar</td>");
    });
  });

  describe("full document rendering", () => {
    it("renders complete document with front page and TOC", () => {
      const html = renderDocumentToHtml(
        makeDoc({
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: "Intro" }],
            },
            {
              type: "paragraph",
              content: [{ type: "text", text: "Some text" }],
            },
          ],
        }),
      );

      // Front page
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain('<div class="front-page">');
      expect(html).toContain("<h1>Test Doc</h1>");
      expect(html).toContain("Alice, Bob");
      expect(html).toContain("Test Workspace");
      expect(html).toContain("2025-01-01");

      // TOC
      expect(html).toContain('class="toc"');
      expect(html).toContain("Table of Contents");

      // Content
      expect(html).toContain("<main>");
      expect(html).toContain("Some text");
    });

    it("handles document with no authors", () => {
      const doc: DocumentData = {
        title: "Lonely Doc",
        authors: [],
        workspaceName: "WS",
        date: "2025-06-01",
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "content" }],
            },
          ],
        },
      };
      const html = renderDocumentToHtml(doc);
      expect(html).toContain("Unknown Author");
    });
  });
});
