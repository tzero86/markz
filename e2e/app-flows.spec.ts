import { test, expect, type Page } from "@playwright/test";
import { tauriMockInitFunc } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockInitFunc);
});

/** Navigates to the app and waits for the shell to mount. */
async function boot(page: Page) {
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
}

/**
 * Opens `root` as the workspace through the Files panel's "No folder open"
 * empty-state action and waits until the tree has finished loading.
 */
async function openWorkspaceFolder(page: Page, root: string) {
  await page.evaluate((r) => localStorage.setItem("__e2e_open_folder_result", r), root);
  await page.click('.activity-btn[aria-label="Files"]');
  await page.locator(".file-tree-scroller .btn-secondary").click();
  await page.waitForSelector(".tree-file", { timeout: 5000 });
}

/** Replaces the whole document: select all in the editor, then type `text`. */
async function replaceDocument(page: Page, text: string) {
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type(text);
}

test.describe("Command palette", () => {
  test("Escape closes the palette and returns focus to the page", async ({ page }) => {
    await boot(page);
    await page.click(".app");
    await page.keyboard.press("Control+Shift+P");

    const palette = page.locator('[role="dialog"][aria-label="Command Palette"]');
    await expect(palette).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".palette-input")).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(palette).toHaveCount(0);
    // Focus is no longer trapped inside the (removed) palette overlay.
    expect(await page.evaluate(() => document.activeElement?.tagName ?? "")).toBe("BODY");
  });

  test("ArrowDown and ArrowUp move the highlighted command", async ({ page }) => {
    await boot(page);
    await page.click(".app");
    // Park the cursor outside the palette so hover cannot steal the highlight.
    await page.mouse.move(0, 0);
    await page.keyboard.press("Control+Shift+P");

    const palette = page.locator('[role="dialog"][aria-label="Command Palette"]');
    await expect(palette).toBeVisible({ timeout: 5000 });

    const labels = await palette.locator(".palette-item .palette-item-label").allTextContents();
    expect(labels.length).toBeGreaterThan(1);

    const highlighted = palette.locator(".palette-item.selected .palette-item-label");
    await expect(highlighted).toHaveText(labels[0]);

    await page.keyboard.press("ArrowDown");
    await expect(highlighted).toHaveText(labels[1]);

    await page.keyboard.press("ArrowUp");
    await expect(highlighted).toHaveText(labels[0]);

    // ArrowUp from the first item wraps around to the last one.
    await page.keyboard.press("ArrowUp");
    await expect(highlighted).toHaveText(labels[labels.length - 1]);
  });

  test("Enter runs the highlighted command", async ({ page }) => {
    await boot(page);
    await page.click(".app");
    // Park the cursor outside the palette so hover cannot change the highlight.
    await page.mouse.move(0, 0);
    await page.keyboard.press("Control+Shift+P");

    const palette = page.locator('[role="dialog"][aria-label="Command Palette"]');
    await expect(palette).toBeVisible({ timeout: 5000 });

    await page.locator(".palette-input").fill("settings");
    await expect(palette.locator(".palette-item.selected .palette-item-label")).toHaveText("Settings");

    await page.keyboard.press("Enter");

    await expect(page.locator('[role="dialog"][aria-label="Settings"]')).toBeVisible({ timeout: 5000 });
    await expect(palette).toHaveCount(0);
  });

  test("Ctrl+P quick-open opens a workspace file by name", async ({ page }) => {
    await boot(page);
    await openWorkspaceFolder(page, "/test-workspace");

    await page.click(".app");
    // Park the cursor outside the palette so hover cannot change the highlight.
    await page.mouse.move(0, 0);
    await page.keyboard.press("Control+p");

    const quickOpen = page.locator('[role="dialog"][aria-label="Quick Open"]');
    await expect(quickOpen).toBeVisible({ timeout: 5000 });

    await page.locator(".palette-input").fill("notes");
    await expect(quickOpen.locator(".palette-item.selected .palette-item-label")).toHaveText("notes.md");

    await page.keyboard.press("Enter");

    await expect(quickOpen).toHaveCount(0);
    const tab = page.locator('.tab-bar .tab:has-text("notes.md")');
    await expect(tab).toBeVisible({ timeout: 5000 });
    await expect(tab).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("Global search panel", () => {
  test("searches the workspace and lists a matching file", async ({ page }) => {
    await boot(page);
    await openWorkspaceFolder(page, "/test-workspace");

    await page.click(".app");
    await page.keyboard.press("Control+Shift+F");

    const panel = page.locator(".search-panel");
    await expect(panel).toBeVisible({ timeout: 5000 });

    await panel.locator(".search-input").fill("hello");
    await panel.locator(".search-btn").click();

    const result = panel.locator(".result-item").first();
    await expect(result).toBeVisible({ timeout: 5000 });
    await expect(result.locator(".result-path")).toHaveText("notes.md");
    await expect(result.locator(".result-context")).toContainText("hello");
    await expect(panel.locator(".search-footer")).toHaveText("1 result");
  });

  test("Escape closes the panel and reopening starts from a clean query", async ({ page }) => {
    await boot(page);
    await openWorkspaceFolder(page, "/test-workspace");

    await page.click(".app");
    await page.keyboard.press("Control+Shift+F");

    const panel = page.locator(".search-panel");
    await expect(panel.locator(".search-input")).toBeVisible({ timeout: 5000 });
    await panel.locator(".search-input").fill("hello");
    await panel.locator(".search-btn").click();
    await expect(panel.locator(".result-item").first()).toBeVisible({ timeout: 5000 });

    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);

    await page.keyboard.press("Control+Shift+F");
    await expect(panel.locator(".search-input")).toBeVisible({ timeout: 5000 });
    await expect(panel.locator(".search-input")).toHaveValue("");
    await expect(panel.locator(".result-item")).toHaveCount(0);
    await expect(panel.locator(".empty-state")).toContainText("Type a query and press Enter to search");
  });
});

test.describe("Links panel", () => {
  // NOTE: the e2e mock has no `get_wikilinks` / `get_backlinks` handlers, so
  // only the no-path state (which never invokes them) is asserted here.
  test("shows the save-to-see-links empty state for an unsaved document", async ({ page }) => {
    await boot(page);

    await page.click('.activity-btn[aria-label="Links"]');

    const sidebar = page.locator(".sidebar");
    await expect(sidebar).toBeVisible({ timeout: 5000 });
    await expect(sidebar.locator(".empty-state h3")).toHaveText("Save to see links");
    await expect(sidebar.locator(".link-section")).toHaveCount(0);
  });
});

test.describe("Export payload", () => {
  test("Export as DOCX records the document markdown", async ({ page }) => {
    await boot(page);
    await page.evaluate(() => localStorage.removeItem("__e2e_export_docx_calls"));
    await replaceDocument(page, "# Export Payload\n\nUnique docx export marker.\n");

    await page.locator('button[aria-label="Copy as"]').click();
    await page.locator('.dropdown-panel[role="menu"] button:has-text("Export as DOCX")').click();

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const raw = localStorage.getItem("__e2e_export_docx_calls");
            const parsed: unknown = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed) || parsed.length === 0) return "";
            const first: unknown = parsed[0];
            if (!first || typeof first !== "object" || !("markdown" in first)) return "";
            return typeof first.markdown === "string" ? first.markdown : "";
          }),
        { timeout: 10000 }
      )
      .toContain("Unique docx export marker.");
  });

  test("hides the Pandoc export entries when Pandoc is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("__e2e_pandoc_available", "false");
    });
    await boot(page);

    await page.locator('button[aria-label="Copy as"]').click();
    const menu = page.locator(".dropdown-panel[role='menu']");
    await expect(menu).toBeVisible({ timeout: 5000 });

    await expect(menu.locator('button:has-text("Pandoc → Word")')).toHaveCount(0);
    await expect(menu.locator('button:has-text("Pandoc → PDF")')).toHaveCount(0);
    await expect(menu.locator('button:has-text("Pandoc → HTML")')).toHaveCount(0);
    await expect(menu.locator('button:has-text("Pandoc → EPUB")')).toHaveCount(0);

    // Direct DOCX export works without Pandoc.
    await expect(menu.locator('button:has-text("Export as DOCX")')).toBeVisible();
  });
});

test.describe("Zen mode", () => {
  test("Ctrl+K then Z hides the chrome and the exit button restores it", async ({ page }) => {
    await boot(page);
    await expect(page.locator(".titlebar")).toBeVisible();
    await expect(page.locator(".zen-exit-btn")).toHaveCount(0);

    await page.click(".app");
    await page.keyboard.press("Control+k");
    await page.keyboard.press("z");

    await expect(page.locator(".zen-exit-btn")).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".titlebar")).toBeHidden();
    await expect(page.locator(".tab-bar")).toBeHidden();
    await expect(page.locator(".activity-bar")).toBeHidden();

    await page.locator(".zen-exit-btn").click();

    await expect(page.locator(".zen-exit-btn")).toHaveCount(0);
    await expect(page.locator(".titlebar")).toBeVisible();
    await expect(page.locator(".tab-bar")).toBeVisible();
  });
});

test.describe("Content zoom", () => {
  test("zoom is persisted and the app resets it to 100% on reload", async ({ page }) => {
    await boot(page);
    const badge = page.locator(".zoom-badge span");
    await expect(badge).toHaveText("100%");

    await page.click(".app");
    await page.keyboard.press("Control+Equal");
    await expect(badge).toHaveText("110%");
    expect(await page.evaluate(() => localStorage.getItem("markz-content-zoom"))).toBe("1.1");

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    // App.svelte resets the zoom store at boot so stale values never persist.
    await expect(page.locator(".zoom-badge span")).toHaveText("100%");
    expect(await page.evaluate(() => localStorage.getItem("markz-content-zoom"))).toBe("1");
  });
});
