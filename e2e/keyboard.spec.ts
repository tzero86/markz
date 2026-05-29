import { test, expect } from "@playwright/test";
import { tauriMockScriptString } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockScriptString);
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

test.describe("Keyboard shortcuts", () => {
  test("Ctrl+T creates a new tab", async ({ page }) => {
    await expect(page.locator(".tab-bar .tab")).toHaveCount(1);
    await page.keyboard.press("Control+t");
    await expect(page.locator(".tab-bar .tab")).toHaveCount(2, { timeout: 3000 });
  });

  test.fixme("Ctrl+W closes the active tab", async ({ page }) => {
    // FIXME: Playwright's Chromium intercepts Ctrl+W (browser close tab).
    // The close-tab logic is thoroughly tested in tabs.spec.ts.
    // Create two tabs via the New tab button
    await page.locator('button[aria-label="New tab"]').click();
    await expect(page.locator(".tab-bar .tab")).toHaveCount(2, { timeout: 3000 });
    const activeTab = page.locator(".tab-bar .tab").last();
    await activeTab.hover();
    await activeTab.locator('button[aria-label^="Close"]').click();
    await expect(page.locator(".tab-bar .tab")).toHaveCount(1, { timeout: 3000 });
  });

  test("Ctrl+O triggers open file", async ({ page }) => {
    await page.keyboard.press("Control+o");
    // Should not crash; app remains stable
    await expect(page.locator(".app")).toBeVisible();
  });

  test("Ctrl+S triggers save", async ({ page }) => {
    await page.keyboard.press("Control+s");
    await expect(page.locator(".app")).toBeVisible();
  });

  test("Ctrl+B toggles sidebar panel", async ({ page }) => {
    // Panel is collapsed by default
    await expect(page.locator(".sidebar")).toHaveCount(0);

    await page.keyboard.press("Control+b");
    await expect(page.locator(".sidebar")).toBeVisible();

    await page.keyboard.press("Control+b");
    await expect(page.locator(".sidebar")).toHaveCount(0);
  });

  test("Ctrl++ zooms in", async ({ page }) => {
    const zoomBadge = page.locator(".zoom-badge span");
    await expect(zoomBadge).toHaveText("100%");

    await page.keyboard.press("Control+Equal");
    await expect(zoomBadge).toHaveText("110%");
  });

  test("Ctrl+- zooms out", async ({ page }) => {
    // Zoom in first
    await page.keyboard.press("Control+Equal");
    await page.keyboard.press("Control+Equal");
    const zoomBadge = page.locator(".zoom-badge span");
    await expect(zoomBadge).toHaveText("120%");

    await page.keyboard.press("Control+Minus");
    await expect(zoomBadge).toHaveText("110%");
  });

  test("Ctrl+0 resets zoom", async ({ page }) => {
    await page.keyboard.press("Control+Equal");
    const zoomBadge = page.locator(".zoom-badge span");
    await expect(zoomBadge).toHaveText("110%");

    await page.keyboard.press("Control+0");
    await expect(zoomBadge).toHaveText("100%");
  });

  test("Escape closes open modals", async ({ page }) => {
    await page.locator('button[aria-label="Settings"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
  });
});
