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

    // Default content has headings; cursor should be at line 1 col 1
    await expect(cursorInfo).toContainText("Ln 1, Col 1");
  });

  test("displays word count", async ({ page }) => {
    const wordCount = page.locator(".status-right .stat-badge").first();
    await expect(wordCount).toBeVisible();

    // Default welcome content has some words
    const text = await wordCount.textContent();
    expect(text).toMatch(/\d+ words/);
  });

  test("displays char count", async ({ page }) => {
    const charBadge = page.locator(".status-right .stat-badge").nth(1);
    await expect(charBadge).toBeVisible();
    const text = await charBadge.textContent();
    expect(text).toMatch(/\d+ chars/);
  });

  test("save indicator shows Saved initially", async ({ page }) => {
    const indicator = page.locator(".save-indicator");
    await expect(indicator).not.toHaveClass(/unsaved/);
    await expect(indicator).toContainText("Saved");
  });

  test("save indicator shows Unsaved when document is dirty", async ({ page }) => {
    // Type something to make document dirty
    await page.locator(".cm-content").click();
    await page.keyboard.type("Hello world");

    const indicator = page.locator(".save-indicator");
    await expect(indicator).toHaveClass(/unsaved/);
    await expect(indicator).toContainText("Unsaved");
  });

  test("zoom badge shows 100% by default", async ({ page }) => {
    // The zoom badge is inside the statusbar
    const zoomBadge = page.locator(".zoom-badge span");
    await expect(zoomBadge).toHaveText("100%");
  });

  test("zoom badge updates after keyboard zoom", async ({ page }) => {
    await page.click('.app');
    await page.keyboard.press("Control+Equal");
    const zoomBadge = page.locator(".zoom-badge span");
    await expect(zoomBadge).toHaveText("110%");
  });

  test("zoom badge resets zoom when clicked", async ({ page }) => {
    await page.click('.app');
    await page.keyboard.press("Control+Equal");
    const zoomBadge = page.locator(".zoom-badge");
    await expect(zoomBadge.locator("span")).toHaveText("110%");

    await zoomBadge.click();
    await expect(zoomBadge.locator("span")).toHaveText("100%");
  });

  test("view mode buttons are present and functional", async ({ page }) => {
    await expect(page.locator('button[aria-label="Split"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Editor"]')).toBeVisible();

    await page.locator('button[aria-label="Editor"]').click();
    await expect(page.locator('button[aria-label="Editor"]')).toHaveClass(/active/);

    await page.locator('button[aria-label="Preview"]').click();
    await expect(page.locator('button[aria-label="Preview"]')).toHaveClass(/active/);

    await page.locator('button[aria-label="Split"]').click();
    await expect(page.locator('button[aria-label="Split"]')).toHaveClass(/active/);
  });

});

test.describe("Git status indicator", () => {
  test("is hidden when document has no path", async ({ page }) => {
    // Default untitled tab has no path — mock returns is_repo: false
    await expect(page.locator(".git-badge")).not.toBeVisible();
  });

  test("shows branch name after opening a file in a repo", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_file_result", "/repo/document.md");
    });

    await page.click('.app');
    await page.keyboard.press("Control+o");
    await page.waitForTimeout(500);

    const gitBadge = page.locator(".git-badge");
    await expect(gitBadge).toBeVisible({ timeout: 3000 });
    await expect(gitBadge).toContainText("main");
  });

  test("shows modified dot for dirty files", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_file_result", "/modified/document.md");
    });

    await page.click('.app');
    await page.keyboard.press("Control+o");
    await page.waitForTimeout(500);

    await expect(page.locator(".git-badge")).toBeVisible({ timeout: 3000 });
    await expect(page.locator(".git-modified-dot")).toBeVisible();
  });

  test("does not show modified dot for clean files", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_file_result", "/repo/document.md");
    });

    await page.click('.app');
    await page.keyboard.press("Control+o");
    await page.waitForTimeout(500);

    await expect(page.locator(".git-badge")).toBeVisible({ timeout: 3000 });
    await expect(page.locator(".git-modified-dot")).not.toBeVisible();
  });
});

test.describe("Git diff panel", () => {
  test("opens when clicking modified dot", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("__e2e_open_file_result", "/repo/modified.md"));
    await page.click('.app');
    await page.keyboard.press("Control+o");
    await page.waitForTimeout(500);

    const gitBadge = page.locator(".git-badge");
    await expect(gitBadge).toBeVisible({ timeout: 5000 });
    await gitBadge.click();

    const diffModal = page.locator('[role="dialog"][aria-label="Git diff"]');
    await expect(diffModal).toBeVisible();
  });

  test("shows diff content for modified file", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("__e2e_open_file_result", "/repo/modified.md"));
    await page.click('.app');
    await page.keyboard.press("Control+o");
    await page.waitForTimeout(500);

    await expect(page.locator(".git-badge")).toBeVisible({ timeout: 5000 });
    await page.locator(".git-badge").click();
    const diffModal = page.locator('[role="dialog"][aria-label="Git diff"]');
    await expect(diffModal).toBeVisible();

    // Check that diff lines are rendered
    await expect(diffModal.locator(".line-add").first()).toBeVisible();
    await expect(diffModal.locator(".line-del").first()).toBeVisible();
  });

  test("shows empty state for clean file", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("__e2e_open_file_result", "/repo/clean.md"));
    await page.click('.app');
    await page.keyboard.press("Control+o");
    await page.waitForTimeout(500);

    await expect(page.locator(".git-badge")).toBeVisible({ timeout: 5000 });
    await page.locator(".git-badge").click();
    const diffModal = page.locator('[role="dialog"][aria-label="Git diff"]');
    await expect(diffModal).toBeVisible();
    await expect(diffModal.locator(".empty")).toHaveText("No changes — file is clean.");
  });

  test("closes on Escape", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("__e2e_open_file_result", "/repo/modified.md"));
    await page.click('.app');
    await page.keyboard.press("Control+o");
    await page.waitForTimeout(500);

    await expect(page.locator(".git-badge")).toBeVisible({ timeout: 5000 });
    await page.locator(".git-badge").click();
    const diffModal = page.locator('[role="dialog"][aria-label="Git diff"]');
    await expect(diffModal).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(diffModal).not.toBeVisible();
  });

  test("opens via Ctrl+Shift+D keyboard shortcut", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("__e2e_open_file_result", "/repo/modified.md"));
    await page.click('.app');
    await page.keyboard.press("Control+o");
    await page.waitForTimeout(500);

    await page.click('.app');
    await page.keyboard.press("Control+Shift+d");
    const diffModal = page.locator('[role="dialog"][aria-label="Git diff"]');
    await expect(diffModal).toBeVisible();
  });
});
