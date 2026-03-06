/**
 * Draw.io rendering utilities.
 *
 * Converts .drawio XML → SVG via the jgraph/export-server (preferred)
 * or Puppeteer + mxGraph viewer (fallback for local dev).
 */

import puppeteer from "puppeteer";
import { env } from "~/lib/env.server";

/**
 * Build the raw.githubusercontent.com URL for a file in a GitHub repo.
 */
export function getDrawioRawUrl(repo: string, path: string, branch = "main"): string {
  return `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
}

/**
 * Convert a .drawio XML string to SVG.
 *
 * Tries the jgraph/export-server first (DRAWIO_EXPORT_URL),
 * falls back to Puppeteer-based rendering.
 */
export async function convertDrawioToSvg(drawioXml: string): Promise<Buffer> {
  if (env.DRAWIO_EXPORT_URL) {
    return convertDrawioViaExportServer(drawioXml);
  }
  return convertDrawioViaPuppeteer(drawioXml);
}

/**
 * Convert via the jgraph/export-server Docker container.
 * POST /export with format=png and xml=<drawio XML>.
 * Note: the export server supports png/pdf/jpg but NOT svg.
 */
async function convertDrawioViaExportServer(drawioXml: string): Promise<Buffer> {
  const url = `${env.DRAWIO_EXPORT_URL}/export`;

  const body = new URLSearchParams({
    format: "png",
    xml: drawioXml,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Draw.io export server error (${res.status}): ${text}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Fallback: convert via Puppeteer + mxGraph viewer (for local dev without Docker).
 */
async function convertDrawioViaPuppeteer(drawioXml: string): Promise<Buffer> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium-browser";

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://viewer.diagrams.net/js/viewer-static.min.js"></script>
</head>
<body>
  <div id="graph-container" class="mxgraph" data-mxgraph='${JSON.stringify({
    highlight: "#0000ff",
    nav: true,
    resize: true,
    xml: drawioXml,
  }).replace(/'/g, "&#39;")}'></div>
</body>
</html>`;

    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30_000,
    });

    await page.waitForSelector(".geDiagramContainer svg", { timeout: 15_000 });

    const svgContent = await page.evaluate(() => {
      const svg = document.querySelector(".geDiagramContainer svg");
      if (!svg) throw new Error("SVG element not found after render");
      return svg.outerHTML;
    });

    const fullSvg = `<?xml version="1.0" encoding="UTF-8"?>\n${svgContent}`;
    return Buffer.from(fullSvg, "utf-8");
  } finally {
    await browser.close();
  }
}

/**
 * Fetch a raw image from a URL (e.g. GitHub raw content) and return as Buffer.
 */
export async function fetchImageBuffer(url: string, token?: string): Promise<Buffer> {
  const fetchHeaders: Record<string, string> = {};
  if (token) {
    fetchHeaders["Authorization"] = `Bearer ${token}`;
    fetchHeaders["Accept"] = "application/vnd.github.raw+json";
    fetchHeaders["X-GitHub-Api-Version"] = "2022-11-28";
  }

  const res = await fetch(url, { headers: fetchHeaders });
  if (!res.ok) {
    throw new Error(`Failed to fetch image (${res.status}): ${url}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
