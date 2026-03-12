import { test, expect } from "@playwright/test";

test.describe("Collaboration", () => {
  const TEST_DOC_URL = "/documents/test-collab-doc-id";

  test("two users can both load the editor on the same document", async ({
    browser,
  }) => {
    // Create two independent browser contexts to simulate two users
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Both users navigate to the same document
    await pageA.goto(TEST_DOC_URL);
    await pageB.goto(TEST_DOC_URL);

    const editorA = pageA.locator(".tiptap, .ProseMirror");
    const editorB = pageB.locator(".tiptap, .ProseMirror");

    // Both editors should be visible and editable
    await expect(editorA).toBeVisible();
    await expect(editorA).toHaveAttribute("contenteditable", "true");

    await expect(editorB).toBeVisible();
    await expect(editorB).toHaveAttribute("contenteditable", "true");

    // NOTE: Testing actual real-time sync (e.g. User A types, User B sees it)
    // requires a running Yjs collaboration server. This scaffold verifies that
    // both browser contexts can independently load the editor.

    await contextA.close();
    await contextB.close();
  });
});
