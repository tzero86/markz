import { test, expect } from "@playwright/test";
import { tauriMockInitFunc } from "./tauri-mock"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockInitFunc);
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

  test("split direction toggle is visible in split mode and toggles", async ({ page }) => {
    // Ensure split mode is active
    await page.locator('button[aria-label="Split"]').click();
    // Start in horizontal → aria-label should be "Split vertical"
    const toggle = page.locator('button[aria-label="Split vertical"]');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('button[aria-label="Preview bottom"]')).toBeVisible();
    // Toggle to reversed
    await page.locator('button[aria-label="Preview bottom"]').click();
    await expect(page.locator('button[aria-label="Side by side"]')).toBeVisible();
    // Toggle back to horizontal
    await page.locator('button[aria-label="Side by side"]').click();
    await expect(page.locator('button[aria-label="Split vertical"]')).toBeVisible();
  });

  test("split direction toggle is hidden in non-split modes", async ({ page }) => {
    await page.locator('button[aria-label="Editor"]').click();
    await expect(page.locator('button[aria-label="Split vertical"]')).not.toBeVisible();
    await expect(page.locator('button[aria-label="Preview bottom"]')).not.toBeVisible();
    // Return to split
    await page.locator('button[aria-label="Split"]').click();
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
    await expect(diffModal.locator(".line-add")).toHaveCount(2);
    await expect(diffModal.locator(".line-del")).toHaveCount(1);
  });
  test("added lines are green with plus marker", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("__e2e_open_file_result", "/repo/modified.md"));
    await page.click('.app');
    await page.keyboard.press("Control+o");
    await page.waitForTimeout(500);
    await page.locator(".git-badge").click();
    const diffModal = page.locator('[role="dialog"][aria-label="Git diff"]');
    // First added line: "Hello modified world."
    const firstAdd = diffModal.locator(".line-add").nth(0);
    await expect(firstAdd).toBeVisible();
    await expect(firstAdd.locator(".line-marker")).toHaveText("+");
    // Second added line: "New line."
    const secondAdd = diffModal.locator(".line-add").nth(1);
    await expect(secondAdd).toBeVisible();
    await expect(secondAdd.locator(".line-marker")).toHaveText("+");
  });
  test("deleted lines are red with minus marker", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("__e2e_open_file_result", "/repo/modified.md"));
    await page.click('.app');
    await page.keyboard.press("Control+o");
    await page.waitForTimeout(500);
    await page.locator(".git-badge").click();
    const diffModal = page.locator('[role="dialog"][aria-label="Git diff"]');
    const delLine = diffModal.locator(".line-del").first();
    await expect(delLine).toBeVisible();
    await expect(delLine.locator(".line-marker")).toHaveText("-");
    await expect(delLine.locator(".line-text")).toContainText("Hello world.");
  });
  test("context lines have both line numbers", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("__e2e_open_file_result", "/repo/modified.md"));
    await page.click('.app');
    await page.keyboard.press("Control+o");
    await page.waitForTimeout(500);
    await page.locator(".git-badge").click();
    const diffModal = page.locator('[role="dialog"][aria-label="Git diff"]');
    // Context line "# Test" should have old=1, new=1
    const contextLine = diffModal.locator(".line-context").first();
    await expect(contextLine).toBeVisible();
    await expect(contextLine.locator(".line-num.old")).toHaveText("1");
    await expect(contextLine.locator(".line-num.new")).toHaveText("1");
  });
  test("added lines only have new line number", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("__e2e_open_file_result", "/repo/modified.md"));
    await page.click('.app');
    await page.keyboard.press("Control+o");
    await page.waitForTimeout(500);
    await page.locator(".git-badge").click();
    const diffModal = page.locator('[role="dialog"][aria-label="Git diff"]');
    const addLine = diffModal.locator(".line-add").first();
    await expect(addLine.locator(".line-num.old")).toHaveText("");
    await expect(addLine.locator(".line-num.new")).toHaveText("2");
  });
  test("deleted lines only have old line number", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("__e2e_open_file_result", "/repo/modified.md"));
    await page.click('.app');
    await page.keyboard.press("Control+o");
    await page.waitForTimeout(500);
    await page.locator(".git-badge").click();
    const diffModal = page.locator('[role="dialog"][aria-label="Git diff"]');
    const delLine = diffModal.locator(".line-del").first();
    await expect(delLine.locator(".line-num.old")).toHaveText("2");
    await expect(delLine.locator(".line-num.new")).toHaveText("");
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
