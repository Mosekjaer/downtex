import puppeteer from "puppeteer";
import type { DocumentLayoutSettings } from "~/lib/citation-formatters";
import { DEFAULT_SETTINGS } from "~/lib/citation-formatters";

const headerFooterFont =
  "font-size: 9px; font-family: Georgia, serif; color: #555;";

function buildHeaderTemplate(settings: DocumentLayoutSettings): string {
  if (settings.headerContent === "none") {
    return '<div style="display:none"></div>';
  }

  let content: string;
  switch (settings.headerContent) {
    case "section":
      // Puppeteer only supports .title, .date, .url, .pageNumber, .totalPages
      // "section" falls back to title since Puppeteer can't access section headings
      content = '<span class="title"></span>';
      break;
    case "custom":
      content = `<span>${settings.headerCustomText}</span>`;
      break;
    case "title":
    default:
      content = '<span class="title"></span>';
      break;
  }

  return `<div style="width: 100%; ${headerFooterFont} padding: 0 2cm; display: flex; justify-content: space-between;">${content}<span></span></div>`;
}

function buildFooterTemplate(settings: DocumentLayoutSettings): string {
  if (settings.footerPageFormat === "none") {
    return '<div style="display:none"></div>';
  }

  let content: string;
  switch (settings.footerPageFormat) {
    case "pageXofY":
      content =
        'Page <span class="pageNumber"></span> of <span class="totalPages"></span>';
      break;
    case "roman":
      // Puppeteer doesn't support roman numerals natively; fall back to Arabic
      content = '<span class="pageNumber"></span>';
      break;
    case "number":
    default:
      content = '<span class="pageNumber"></span>';
      break;
  }

  return `<div style="width: 100%; ${headerFooterFont} text-align: center;">${content}</div>`;
}

/**
 * Generate a PDF buffer from an HTML string using Puppeteer.
 */
export async function generatePdf(
  htmlContent: string,
  settings?: DocumentLayoutSettings,
): Promise<Buffer> {
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium-browser";

  const docSettings = settings ?? DEFAULT_SETTINGS;

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
      timeout: 30_000,
    });

    const hasHeader = docSettings.headerContent !== "none";
    const hasFooter = docSettings.footerPageFormat !== "none";

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "2.5cm",
        bottom: "2.5cm",
        left: "2cm",
        right: "2cm",
      },
      displayHeaderFooter: hasHeader || hasFooter,
      headerTemplate: buildHeaderTemplate(docSettings),
      footerTemplate: buildFooterTemplate(docSettings),
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
