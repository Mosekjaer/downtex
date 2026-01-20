import puppeteer from "puppeteer";

/**
 * Generate a PDF buffer from an HTML string using Puppeteer.
 */
export async function generatePdf(htmlContent: string): Promise<Buffer> {
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium-browser";

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

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "2.5cm",
        bottom: "2.5cm",
        left: "2cm",
        right: "2cm",
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; font-size: 9px; font-family: Georgia, serif; color: #555; padding: 0 2cm; display: flex; justify-content: space-between;">
          <span class="title"></span>
          <span></span>
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; font-size: 9px; font-family: Georgia, serif; color: #555; text-align: center;">
          <span class="pageNumber"></span>
        </div>
      `,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
