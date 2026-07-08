import { test, expect } from "@playwright/test";
import { tauriMockInitFunc } from "./tauri-mock"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockInitFunc);
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

test.describe("Outline sidebar", () => {
  test("is visible by default and shows heading outline", async ({ page }) => {
    // Panel is collapsed by default — click Outline to open
    await page.click('.activity-btn[aria-label="Outline"]');
    const sidebar = page.locator(".sidebar");
    await expect(sidebar).toBeVisible();

    // Default content has "What Makes MarkZ Different" heading
    await expect(sidebar.locator('.toc-link:has-text("What Makes MarkZ Different")')).toBeVisible();
  });

  test("shows empty state when no headings", async ({ page }) => {
    // Open Outline panel first
    await page.click('.activity-btn[aria-label="Outline"]');

    // Replace editor content with plain text (no headings)
    await page.locator(".cm-content").click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("No headings here.");

    const sidebar = page.locator(".sidebar");
    await expect(sidebar.locator('.empty-state h3:has-text("No headings")')).toBeVisible({ timeout: 3000 });
  });

  test("Ctrl+B collapses and expands sidebar panel", async ({ page }) => {
    // Panel is collapsed by default
    await expect(page.locator(".sidebar")).toHaveCount(0);
    await page.click('.app');
    await page.keyboard.press("Control+b");
    await expect(page.locator(".sidebar")).toBeVisible();
    await page.click('.app');
    await page.keyboard.press("Control+b");
    await expect(page.locator(".sidebar")).toHaveCount(0);
  });

  test("clicking an outline item scrolls editor and preview to the heading", async ({ page }) => {
    // Open Outline panel first
    await page.click('.activity-btn[aria-label="Outline"]');

    const sidebar = page.locator(".sidebar");
    // Use the default welcome content heading; it is already rendered in editor/preview.
    const targetLink = sidebar.locator('.toc-link:has-text("What Makes MarkZ Different")');
    await expect(targetLink).toBeVisible({ timeout: 3000 });

    // Wait for the preview to render the target heading
    const targetHeading = page.locator('.preview-content :is(h1,h2,h3):has-text("What Makes MarkZ Different")');
    await expect(targetHeading).toBeVisible({ timeout: 3000 });

    // Scroll preview to top first to ensure we actually move on click
    await page.evaluate(() => {
      const scroller = document.querySelector(".preview-scroller");
      if (scroller) scroller.scrollTop = 0;
    });

    const scrollTopBefore = await page.evaluate(() => {
      const scroller = document.querySelector(".preview-scroller");
      return scroller ? scroller.scrollTop : 0;
    });

    await targetLink.click();

    // Give smooth preview scroll a moment to settle
    await page.waitForTimeout(600);

    // Editor cursor should now be on the target heading line
    const cursorLine = await page.evaluate(() => {
      const cm = document.querySelector(".cm-content");
      if (!cm) return null;
      const view = (window as any).EditorView?.findFromDOM?.(cm) ?? (window as any).__markz_editorView;
      if (!view) return null;
      const pos = view.state.selection.main.head;
      return view.state.doc.lineAt(pos).number;
    });
    expect(cursorLine).toBeGreaterThanOrEqual(5);

    // Preview should have scrolled down toward the target heading
    const scrollTopAfter = await page.evaluate(() => {
      const scroller = document.querySelector(".preview-scroller");
      return scroller ? scroller.scrollTop : 0;
    });
    expect(scrollTopAfter).toBeGreaterThan(scrollTopBefore);
    // Heading should be at or near the top of the preview viewport
    const headingBox = await targetHeading.boundingBox();
    const scrollerBox = await page.locator(".preview-scroller").boundingBox();
    expect(headingBox).not.toBeNull();
    expect(scrollerBox).not.toBeNull();
    expect(headingBox!.y).toBeLessThanOrEqual(scrollerBox!.y + 120);
  });
});

test.describe("Preview pane Copy dropdown", () => {
  test("preview renders HTML by default", async ({ page }) => {
    // Verify the preview-scroller is present
    await expect(page.locator(".preview-scroller")).toBeVisible();

    // The preview content div exists in the DOM
    const previewContent = page.locator(".preview-content");
    await expect(previewContent).toBeVisible();
  });

  test("copy dropdown opens and shows format options", async ({ page }) => {
    // Set a path so the Copy button is enabled
    await page.evaluate(() => {
      const ts = (window as any).__markz_tabStore;
      if (ts && ts.setPath) ts.setPath("/test/copy.md");
    });
    await page.waitForTimeout(500);

    const copyBtn = page.locator('button[aria-label="Copy"]');
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn).not.toBeDisabled();
    await copyBtn.click();

    const dropdown = page.locator(".copy-dropdown-menu");
    await expect(dropdown).toBeVisible();

    await expect(dropdown.locator('.copy-dropdown-item:has-text("Copy as HTML")')).toBeVisible();
    await expect(dropdown.locator('.copy-dropdown-item:has-text("Copy as JIRA")')).toBeVisible();
    await expect(dropdown.locator('.copy-dropdown-item:has-text("Copy as Confluence")')).toBeVisible();
    await expect(dropdown.locator('.copy-dropdown-item:has-text("Copy as Slack")')).toBeVisible();
    await expect(dropdown.locator('.copy-dropdown-item:has-text("Copy as GitHub")')).toBeVisible();
    await expect(dropdown.locator('.copy-dropdown-item:has-text("Copy as Word (Pandoc)")')).toBeVisible();
  });

  test("Copy as Word (Pandoc) copies Pandoc HTML to clipboard", async ({ page }) => {
    // Set a path so the Copy button is enabled and supply deterministic Markdown
    await page.evaluate(() => {
      const ts = (window as any).__markz_tabStore;
      if (ts && ts.setPath) ts.setPath("/test/pandoc-copy.md");
      if (ts && ts.setContent) ts.setContent("# Pandoc Copy Test\n\nHello World.");
    });
    await page.waitForTimeout(500);

    const copyBtn = page.locator('button[aria-label="Copy"]');
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn).not.toBeDisabled();
    await copyBtn.click();

    const dropdown = page.locator(".copy-dropdown-menu");
    await expect(dropdown).toBeVisible();

    await dropdown.locator('.copy-dropdown-item:has-text("Copy as Word (Pandoc)")').click();

    // Button should show success state
    await expect(page.locator(".float-btn.success")).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.float-btn .action-label:has-text("Copied")')).toBeVisible();

    // Verify the backend command was called with the expected format
    const calls = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("__e2e_copy_pandoc_calls") || "[]");
    });
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[calls.length - 1].format).toBe("html");

    // Verify rich clipboard data was written
    const clipboardTypes = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("__e2e_clipboard_write_types") || "[]");
    });
    expect(clipboardTypes).toContain("text/html");
    expect(clipboardTypes).toContain("text/plain");
  });

  test("Copy as Word (Pandoc) option hidden when Pandoc unavailable", async ({ page }) => {
    // Disable Pandoc before the app boots
    await page.addInitScript(() => {
      localStorage.setItem("__e2e_pandoc_available", "false");
    });
    await page.addInitScript(tauriMockInitFunc);
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    // Set a path so the Copy button is enabled
    await page.evaluate(() => {
      const ts = (window as any).__markz_tabStore;
      if (ts && ts.setPath) ts.setPath("/test/no-pandoc.md");
    });
    await page.waitForTimeout(500);

    const copyBtn = page.locator('button[aria-label="Copy"]');
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn).not.toBeDisabled();
    await copyBtn.click();

    const dropdown = page.locator(".copy-dropdown-menu");
    await expect(dropdown).toBeVisible();

    await expect(dropdown.locator('.copy-dropdown-item:has-text("Copy as Word (Pandoc)")')).toHaveCount(0);
  });

  test("copy button shows feedback after clicking", async ({ page }) => {
    // Set a path so the Copy button is enabled
    await page.evaluate(() => {
      const ts = (window as any).__markz_tabStore;
      if (ts && ts.setPath) ts.setPath("/test/copy-feedback.md");
    });
    await page.waitForTimeout(500);

    const copyBtn = page.locator('button[aria-label="Copy"]');
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn).not.toBeDisabled();
    await copyBtn.click();

    const dropdown = page.locator(".copy-dropdown-menu");
    await expect(dropdown).toBeVisible();

    // Click the first format option (HTML)
    await dropdown.locator(".copy-dropdown-item").first().click();

    // Button should show success state
    await expect(page.locator(".float-btn.success")).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.float-btn .action-label:has-text("Copied")')).toBeVisible();
  });
});
