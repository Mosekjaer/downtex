/**
 * Draw.io rendering utilities.
 *
 * Constructs URLs for the draw.io embed viewer and raw GitHub file access,
 * plus server-side .drawio → SVG conversion via Puppeteer + mxGraph.
 */

import puppeteer from "puppeteer";

/**
 * Build the raw.githubusercontent.com URL for a file in a GitHub repo.
 */
export function getDrawioRawUrl(repo: string, path: string, branch = "main"): string {
  return `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
}

/**
 * Build the draw.io embed viewer URL that renders a .drawio file hosted on
 * GitHub via an iframe.
 *
 * URL format:
 *   https://viewer.diagrams.net/?tags={}&target=blank&highlight=0000ff
 *     &edit=_blank&layers=1&nav=1&title=<filename>#U<rawUrl>
 */
export function getDrawioEmbedUrl(repo: string, path: string, branch = "main"): string {
  const rawUrl = getDrawioRawUrl(repo, path, branch);
  const filename = path.split("/").pop() ?? "diagram";

  return (
    `https://viewer.diagrams.net/` +
    `?tags=%7B%7D` +
    `&target=blank` +
    `&highlight=0000ff` +
    `&edit=_blank` +
    `&layers=1` +
    `&nav=1` +
    `&title=${encodeURIComponent(filename)}` +
    `#U${encodeURIComponent(rawUrl)}`
  );
}

/**
 * Convert a .drawio XML string to SVG using Puppeteer + mxGraph.
 *
 * Spins up a headless browser, loads the mxGraph client library,
 * injects the drawio XML, renders the diagram, and extracts the SVG.
 */
export async function convertDrawioToSvg(drawioXml: string): Promise<Buffer> {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium-browser";

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();

    // Minimal HTML page that loads mxGraph and renders the diagram to SVG
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

    // Wait for the mxGraph viewer to render
    await page.waitForSelector(".geDiagramContainer svg", { timeout: 15_000 });

    // Extract the SVG element
    const svgContent = await page.evaluate(() => {
      const svg = document.querySelector(".geDiagramContainer svg");
      if (!svg) throw new Error("SVG element not found after render");
      return svg.outerHTML;
    });

    // Wrap in a standalone SVG document
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
