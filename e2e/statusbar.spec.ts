import { test, expect } from "@playwright/test";
import { tauriMockScriptString } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockScriptString);
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

test.describe("Status bar", () => {
  test("displays cursor position", async ({ page }) => {
    const cursorInfo = page.locator(".cursor-info");
    await expect(cursorInfo).toBeVisible();
    await expect(cursorInfo).toContainText("Ln");
    await expect(cursorInfo).toContainText("Col");
  });

  test("displays word count", async ({ page }) => {
    const badges = page.locator(".stat-badge");
    // First badge is word count, second is char count
    await expect(badges.first()).toBeVisible();
    const wordCount = await badges.first().textContent();
    expect(Number(wordCount)).toBeGreaterThanOrEqual(0);
  });

  test("displays char count", async ({ page }) => {
    const badges = page.locator(".stat-badge");
    await expect(badges.nth(1)).toBeVisible();
    const charCount = await badges.nth(1).textContent();
    expect(Number(charCount)).toBeGreaterThan(0);
  });

  test("save indicator shows Saved initially", async ({ page }) => {
    await expect(page.locator('.save-text:has-text("Saved")')).toBeVisible();
    await expect(page.locator(".save-indicator")).not.toHaveClass(/unsaved/);
  });

  test("save indicator shows Unsaved when document is dirty", async ({ page }) => {
    // Focus editor and type to make it dirty
    await page.locator(".cm-content").click();
    await page.keyboard.type("# Modified doc\n");

    await expect(page.locator('.save-text:has-text("Unsaved")')).toBeVisible({ timeout: 3000 });
    await expect(page.locator(".save-indicator")).toHaveClass(/unsaved/);
  });

  test("zoom badge shows 100% by default", async ({ page }) => {
    // The zoom badge is inside the statusbar
    const zoomBadge = page.locator(".zoom-badge span");
    await expect(zoomBadge).toHaveText("100%");
  });

  test("zoom badge updates after keyboard zoom", async ({ page }) => {
    await page.keyboard.press("Control+Equal");
    const zoomBadge = page.locator(".zoom-badge span");
    await expect(zoomBadge).toHaveText("110%");
  });

  test("zoom badge resets zoom when clicked", async ({ page }) => {
    await page.keyboard.press("Control+Equal");
    const zoomBadge = page.locator(".zoom-badge");
    await expect(zoomBadge.locator("span")).toHaveText("110%");

    await zoomBadge.click();
    await expect(zoomBadge.locator("span")).toHaveText("100%");
  });

  test("view mode buttons are present and functional", async ({ page }) => {
    await expect(page.locator('button[aria-label="Split"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Editor"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Preview"]')).toBeVisible();

    // Split should be active by default
    await expect(page.locator('button[aria-label="Split"]')).toHaveClass(/active/);

    await page.locator('button[aria-label="Editor"]').click();
    await expect(page.locator('button[aria-label="Editor"]')).toHaveClass(/active/);

    await page.locator('button[aria-label="Preview"]').click();
    await expect(page.locator('button[aria-label="Preview"]')).toHaveClass(/active/);

    await page.locator('button[aria-label="Split"]').click();
    await expect(page.locator('button[aria-label="Split"]')).toHaveClass(/active/);
  });

  test("format badges show Markdown and UTF-8", async ({ page }) => {
    const formatBadges = page.locator(".format-badge");
    await expect(formatBadges.filter({ hasText: "Markdown" })).toBeVisible();
    await expect(formatBadges.filter({ hasText: "UTF-8" })).toBeVisible();
  });
});
