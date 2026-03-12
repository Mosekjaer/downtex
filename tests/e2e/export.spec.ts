import { test, expect } from "@playwright/test";

test.describe("Export", () => {
  const TEST_DOC_URL = "/documents/test-doc-id";

  test("Export PDF button is visible for editors", async ({ page }) => {
    await page.goto(TEST_DOC_URL);

    const exportButton = page.getByRole("button", { name: /export.*pdf/i });
    await expect(exportButton).toBeVisible();
  });

  test("clicking Export PDF initiates a download", async ({ page }) => {
    await page.goto(TEST_DOC_URL);

    const exportButton = page.getByRole("button", { name: /export.*pdf/i });

    // Listen for the download event before clicking
    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();

    const download = await downloadPromise;

    // Verify the downloaded file has a PDF-like name
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });
});
