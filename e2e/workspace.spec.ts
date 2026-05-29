import { test, expect } from "@playwright/test";
import { tauriMockScriptString } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockScriptString);
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

test.describe("Workspace file tree", () => {
  test("shows open folder prompt initially", async ({ page }) => {
    await page.click('.activity-btn[aria-label="Files"]');
    await expect(page.locator(".file-tree-scroller .empty")).toContainText("No folder open");
    await expect(page.locator(".open-folder-btn")).toBeVisible();
  });

  test("opens folder and displays file tree", async ({ page }) => {
    // Directly set the workspace state via page.evaluate
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    
    // Open Files tab
    await page.click('.activity-btn[aria-label="Files"]');
    
    // Click Open Folder
    await page.click(".open-folder-btn");
    
    // Wait for tree to appear
    await page.waitForSelector(".tree-file", { timeout: 5000 });
    
    // Check tree nodes are rendered
    await expect(page.locator(".tree-dir").first()).toBeVisible();
    await expect(page.locator(".tree-file").first()).toBeVisible();
  });

  test("expands directory on click", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    await page.click('.activity-btn[aria-label="Files"]');
    await page.click(".open-folder-btn");
    await page.waitForSelector(".tree-dir", { timeout: 5000 });

    const dirBtn = page.locator(".tree-dir").first();
    await dirBtn.click();

    // Chevron should be rotated
    await expect(dirBtn.locator(".tree-chevron.expanded")).toBeVisible();
    // Child file should appear
    await expect(page.locator(".tree-file").first()).toBeVisible();
  });

  test("opens file from tree", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    await page.click('.activity-btn[aria-label="Files"]');
    await page.click(".open-folder-btn");
    await page.waitForSelector(".tree-file", { timeout: 5000 });

    await page.locator(".tree-file").first().click();
    // Should open in a new tab
    await expect(page.locator('.tab:has-text("notes.md")')).toBeVisible();
  });

  test("search finds matches", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    await page.click('.activity-btn[aria-label="Files"]');
    await page.click(".open-folder-btn");
    await page.waitForSelector(".tree-file", { timeout: 5000 });

    const searchInput = page.locator('.search-box input');
    await searchInput.fill("hello");
    await page.waitForTimeout(400); // wait for debounce

    await expect(page.locator(".search-results")).toBeVisible();
    await expect(page.locator(".search-result-btn").first()).toBeVisible();
  });

  test("opens search result file", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    await page.click('.activity-btn[aria-label="Files"]');
    await page.click(".open-folder-btn");
    await page.waitForSelector(".tree-file", { timeout: 5000 });

    await page.locator('.search-box input').fill("hello");
    await page.waitForTimeout(400);

    await page.locator(".search-result-btn").first().click();
    await expect(page.locator('.tab:has-text("notes.md")')).toBeVisible();
  });
});

test.describe("Open folder keyboard shortcut", () => {
  test("Ctrl+Shift+O triggers open folder dialog", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    await page.keyboard.press("Control+Shift+o");
    await page.waitForTimeout(500);

    await page.click('.activity-btn[aria-label="Files"]');
    await expect(page.locator(".tree-file").first()).toBeVisible();
  });
});

test.describe("TitleBar open folder button", () => {
  test("opens folder when clicked", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    const btn = page.locator('[aria-label="Open folder"]');
    await expect(btn).toBeVisible();
    await btn.click();
    await page.waitForTimeout(500);

    await page.click('.activity-btn[aria-label="Files"]');
    await expect(page.locator(".tree-file").first()).toBeVisible();
  });
});
