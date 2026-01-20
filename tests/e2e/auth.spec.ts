import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("shows login page with OAuth buttons", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /github/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});
