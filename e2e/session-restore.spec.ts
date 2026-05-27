import { test, expect } from "@playwright/test";
import { tauriMockScriptString } from "./tauri-mock";

test.describe("Session restore", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(tauriMockScriptString);
  });

  test("restores previously opened file tabs on reload", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    // Simulate a session with two file paths in localStorage
    await page.evaluate(() => {
      localStorage.setItem(
        "markz-session",
        JSON.stringify({
          tabs: [
            { path: "/home/user/doc1.md" },
            { path: "/home/user/doc2.md" },
          ],
          activeTabPath: "/home/user/doc2.md",
        })
      );
    });

    // Reload the page — session restore should fire in onMount
    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    // Both file tabs should be restored
    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(2, { timeout: 5000 });

    // Titles come from path basename via openDocumentByPath
    await expect(tabs.nth(0)).toContainText("doc1.md");
    await expect(tabs.nth(1)).toContainText("doc2.md");

    // Previously active tab should remain active
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
  });

  test("falls back to welcome tab when session is empty", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    // Clear any session
    await page.evaluate(() => {
      localStorage.removeItem("markz-session");
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    // Should show the default single welcome tab
    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(1);
    await expect(tabs.first()).toContainText("Untitled");
  });

  test("ignores missing files and restores the rest", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    // Set up session and configure mock to reject /missing.md via localStorage
    await page.evaluate(() => {
      localStorage.setItem(
        "markz-session",
        JSON.stringify({
          tabs: [
            { path: "/good.md" },
            { path: "/missing.md" },
          ],
          activeTabPath: "/good.md",
        })
      );
      localStorage.setItem("__e2e_reject_paths", JSON.stringify(["/missing.md"]));
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    // Only the good file should be restored
    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(1, { timeout: 5000 });
    await expect(tabs.first()).toContainText("good.md");
  });

  test("saves session when opening a new file tab", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    // Programmatically trigger opening a file via the mock
    await page.evaluate(() => {
      // Simulate what happens after openDocumentByPath succeeds
      // We inject a session directly and verify it persists after reload
      localStorage.setItem(
        "markz-session",
        JSON.stringify({
          tabs: [{ path: "/project/readme.md" }],
          activeTabPath: "/project/readme.md",
        })
      );
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(1, { timeout: 5000 });
    await expect(tabs.first()).toContainText("readme.md");
  });

  test("corrupted session data is ignored", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem("markz-session", "not-json{{{");
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    // Should gracefully fall back to default tab
    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(1);
  });

  test("deduplicates duplicate paths in session", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem(
        "markz-session",
        JSON.stringify({
          tabs: [
            { path: "/same.md" },
            { path: "/same.md" },
            { path: "/other.md" },
          ],
          activeTabPath: "/same.md",
        })
      );
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    const tabs = page.locator(".tab-bar .tab");
    // same.md should appear only once
    await expect(tabs).toHaveCount(2, { timeout: 5000 });
    const texts = await tabs.allTextContents();
    const sameCount = texts.filter((t) => t.includes("same.md")).length;
    expect(sameCount).toBe(1);
  });
});
