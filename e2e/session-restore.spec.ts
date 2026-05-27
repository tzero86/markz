import { test, expect } from "@playwright/test";
import { tauriMockScriptString } from "./tauri-mock";

test.describe("Session restore", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(tauriMockScriptString);
  });

  test("restores previously opened file tabs on reload", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem(
        "markz-session",
        JSON.stringify({
          tabs: [
            { content: "# Doc1", path: "/home/user/doc1.md", title: "doc1.md", isDirty: false },
            { content: "# Doc2", path: "/home/user/doc2.md", title: "doc2.md", isDirty: false },
          ],
          activeTabPath: "/home/user/doc2.md",
        })
      );
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(2, { timeout: 5000 });

    await expect(tabs.nth(0)).toContainText("doc1.md");
    await expect(tabs.nth(1)).toContainText("doc2.md");

    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
  });

  test("restores untitled tabs with their content", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem(
        "markz-session",
        JSON.stringify({
          tabs: [
            { content: "# My Draft\n\nSome unsaved content here.", path: null, title: "Untitled", isDirty: true },
          ],
          activeTabPath: null,
        })
      );
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(1, { timeout: 5000 });
    await expect(tabs.first()).toContainText("Untitled");

    // The dirty dot should be visible since isDirty was true
    await expect(tabs.first().locator(".tab-dot")).toBeVisible({ timeout: 3000 });
  });

  test("falls back to welcome tab when session is empty", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    await page.evaluate(() => {
      localStorage.removeItem("markz-session");
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(1);
    await expect(tabs.first()).toContainText("Untitled");
  });

  test("ignores missing files and restores the rest", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem(
        "markz-session",
        JSON.stringify({
          tabs: [
            { content: "", path: "/good.md", title: "good.md", isDirty: false },
            { content: "", path: "/missing.md", title: "missing.md", isDirty: false },
          ],
          activeTabPath: "/good.md",
        })
      );
      localStorage.setItem("__e2e_reject_paths", JSON.stringify(["/missing.md"]));
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(1, { timeout: 5000 });
    await expect(tabs.first()).toContainText("good.md");
  });

  test("corrupted session data is ignored", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem("markz-session", "not-json{{{");
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

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
            { content: "", path: "/same.md", title: "same.md", isDirty: false },
            { content: "", path: "/same.md", title: "same.md", isDirty: false },
            { content: "", path: "/other.md", title: "other.md", isDirty: false },
          ],
          activeTabPath: "/same.md",
        })
      );
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(2, { timeout: 5000 });
    const texts = await tabs.allTextContents();
    const sameCount = texts.filter((t) => t.includes("same.md")).length;
    expect(sameCount).toBe(1);
  });
});
