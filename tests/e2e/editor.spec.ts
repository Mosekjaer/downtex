import { test, expect } from "@playwright/test";

test.describe("Editor", () => {
  // TODO: Replace with actual auth setup (e.g. storageState from a login fixture)
  test.use({ storageState: { cookies: [], origins: [] } });

  const TEST_DOC_URL = "/documents/test-doc-id";

  test("authenticated user can navigate to a document", async ({ page }) => {
    await page.goto(TEST_DOC_URL);
    // Expect to land on the document page rather than being redirected to login
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator(".tiptap, .ProseMirror")).toBeVisible();
  });

  test("editor loads with Tiptap editor element", async ({ page }) => {
    await page.goto(TEST_DOC_URL);
    const editor = page.locator(".tiptap, .ProseMirror");
    await expect(editor).toBeVisible();
    await expect(editor).toHaveAttribute("contenteditable", "true");
  });

  test("can type text in the editor", async ({ page }) => {
    await page.goto(TEST_DOC_URL);
    const editor = page.locator(".tiptap, .ProseMirror");
    await editor.click();
    await editor.pressSequentially("Hello, Downtex!");
    await expect(editor).toContainText("Hello, Downtex!");
  });

  test("can apply bold formatting", async ({ page }) => {
    await page.goto(TEST_DOC_URL);
    const editor = page.locator(".tiptap, .ProseMirror");
    await editor.click();
    await editor.pressSequentially("bold text");

    // Select all text and apply bold
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Control+B");

    await expect(editor.locator("strong")).toContainText("bold text");
  });

  test("can create a heading", async ({ page }) => {
    await page.goto(TEST_DOC_URL);
    const editor = page.locator(".tiptap, .ProseMirror");
    await editor.click();

    // Type markdown-style heading and let Tiptap convert it
    await editor.pressSequentially("# My Heading");
    await page.keyboard.press("Enter");

    await expect(editor.locator("h1")).toContainText("My Heading");
  });
});
