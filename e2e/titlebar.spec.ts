import { test, expect } from "@playwright/test";
import { tauriMockScriptString } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockScriptString);
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

test.describe("Title bar", () => {
  test("displays document title", async ({ page }) => {
    await expect(page.locator(".doc-title")).toHaveText("Untitled");
  });

  test("new file button creates a new tab", async ({ page }) => {
    await page.locator('button[aria-label="New file"]').click();
    await expect(page.locator(".tab-bar .tab")).toHaveCount(2, { timeout: 3000 });
  });

  test("open file button shows dialog", async ({ page }) => {
    // Mock returns null so dialog is effectively cancelled
    await page.locator('button[aria-label="Open file"]').click();
    // App should still be stable
    await expect(page.locator(".app")).toBeVisible();
    await expect(page.locator(".tab-bar .tab")).toHaveCount(1);
  });

  test("save file button works", async ({ page }) => {
    await page.locator('button[aria-label="Save file"]').click();
    await expect(page.locator(".app")).toBeVisible();
  });
});

test.describe("Export dropdown", () => {
  test("opens and shows all copy/export options", async ({ page }) => {
    await page.locator('button[aria-label="Copy as"]').click();
    const dropdown = page.locator('[role="menu"]');
    await expect(dropdown).toBeVisible();

    await expect(dropdown.locator('button:has-text("Copy as JIRA")')).toBeVisible();
    await expect(dropdown.locator('button:has-text("Copy as Confluence")')).toBeVisible();
    await expect(dropdown.locator('button:has-text("Copy as Slack")')).toBeVisible();
    await expect(dropdown.locator('button:has-text("Copy as GitHub")')).toBeVisible();
    await expect(dropdown.locator('button:has-text("Copy as HTML")')).toBeVisible();
    await expect(dropdown.locator('button:has-text("Export as DOCX")')).toBeVisible();
  });

  test("copy as JIRA shows toast", async ({ page }) => {
    await page.locator('button[aria-label="Copy as"]').click();
    await page.locator('button:has-text("Copy as JIRA")').click();

    // Toast should appear
    await expect(page.locator('.toast:has-text("Copy as JIRA")')).toBeVisible({ timeout: 3000 });
  });

  test("copy as Confluence shows toast", async ({ page }) => {
    await page.locator('button[aria-label="Copy as"]').click();
    await page.locator('button:has-text("Copy as Confluence")').click();
    await expect(page.locator('.toast:has-text("Copy as Confluence")')).toBeVisible({ timeout: 3000 });
  });

  test("copy as Slack shows toast", async ({ page }) => {
    await page.locator('button[aria-label="Copy as"]').click();
    await page.locator('button:has-text("Copy as Slack")').click();
    await expect(page.locator('.toast:has-text("Copy as Slack")')).toBeVisible({ timeout: 3000 });
  });

  test("copy as GitHub shows toast", async ({ page }) => {
    await page.locator('button[aria-label="Copy as"]').click();
    await page.locator('button:has-text("Copy as GitHub")').click();
    await expect(page.locator('.toast:has-text("Copy as GitHub")')).toBeVisible({ timeout: 3000 });
  });

  test("copy as HTML shows toast", async ({ page }) => {
    await page.locator('button[aria-label="Copy as"]').click();
    await page.locator('button:has-text("Copy as HTML")').click();
    await expect(page.locator('.toast:has-text("Copy as HTML")')).toBeVisible({ timeout: 3000 });
  });

  test("export as DOCX closes dropdown when dialog cancelled", async ({ page }) => {
    await page.locator('button[aria-label="Copy as"]').click();
    await page.locator('button:has-text("Export as DOCX")').click();
    // Mock save_file_dialog returns null, dropdown should close
    await expect(page.locator('[role="menu"]')).not.toBeVisible({ timeout: 3000 });
  });

  test("closes dropdown on Escape", async ({ page }) => {
    await page.locator('button[aria-label="Copy as"]').click();
    await expect(page.locator('[role="menu"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="menu"]')).not.toBeVisible();
  });
});

test.describe("Recent files dropdown", () => {
  test("opens and shows empty state", async ({ page }) => {
    await page.locator('button[aria-label="Recent files"]').click();
    const dropdown = page.locator('.recent-panel');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.locator('text=No recent files')).toBeVisible();
  });

  test("closes when clicking elsewhere", async ({ page }) => {
    await page.locator('button[aria-label="Recent files"]').click();
    await expect(page.locator('.recent-panel')).toBeVisible();
    await page.locator('.editor-pane').click();
    await expect(page.locator('.recent-panel')).not.toBeVisible();
  });
});

test.describe("Template buttons", () => {
  test("new from template button opens template browser", async ({ page }) => {
    await page.locator('button[aria-label="New from Template"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });
    await expect(modal).toHaveAttribute("aria-label", "Templates");
  });

  test("save as template button opens save dialog", async ({ page }) => {
    await page.locator('button[aria-label="Save as Template"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });
    await expect(modal).toHaveAttribute("aria-label", "Save as Template");
  });
});

test.describe("DOCX export", () => {
  test("triggers export_to_docx command", async ({ page }) => {
    // Clear any previous calls
    await page.evaluate(() => localStorage.removeItem("__e2e_export_docx_calls"));

    // Open export dropdown
    await page.locator('button[aria-label="Copy as"]').click();
    await page.locator('button:has-text("Export as DOCX")').click();

    // Wait for async operations
    await page.waitForTimeout(500);

    // Verify export_to_docx was called
    const calls = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("__e2e_export_docx_calls") || "[]")
    );
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[0]).toHaveProperty("markdown");
    expect(calls[0]).toHaveProperty("outputPath");
    expect(calls[0].outputPath).toBe("/tmp/test-export.docx");
  });

  test("shows info toast during export", async ({ page }) => {
    await page.locator('button[aria-label="Copy as"]').click();
    await page.locator('button:has-text("Export as DOCX")').click();
    await expect(page.locator('.toast:has-text("Preparing")')).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Pandoc export", () => {
  test("shows Pandoc export options when Pandoc is available", async ({ page }) => {
    await page.locator('button[aria-label="Copy as"]').click();

    // The mock returns pandoc_available: true
    await expect(page.locator('button:has-text("Pandoc → Word")')).toBeVisible();
    await expect(page.locator('button:has-text("Pandoc → PDF")')).toBeVisible();
    await expect(page.locator('button:has-text("Pandoc → HTML")')).toBeVisible();
    await expect(page.locator('button:has-text("Pandoc → EPUB")')).toBeVisible();
  });

  test("triggers export_via_pandoc for Word", async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem("__e2e_export_pandoc_calls"));

    await page.locator('button[aria-label="Copy as"]').click();
    await page.locator('button:has-text("Pandoc → Word")').click();
    await page.waitForTimeout(500);

    const calls = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("__e2e_export_pandoc_calls") || "[]")
    );
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[0]).toHaveProperty("markdown");
    expect(calls[0]).toHaveProperty("outputPath");
    expect(calls[0].format).toBe("docx");
  });

  test("triggers export_via_pandoc for PDF", async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem("__e2e_export_pandoc_calls"));

    await page.locator('button[aria-label="Copy as"]').click();
    await page.locator('button:has-text("Pandoc → PDF")').click();
    await page.waitForTimeout(500);

    const calls = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("__e2e_export_pandoc_calls") || "[]")
    );
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[0].format).toBe("pdf");
  });
});

test.describe("Print to PDF", () => {
  test("shows Print to PDF option in export dropdown", async ({ page }) => {
    await page.locator('button[aria-label="Copy as"]').click();
    await expect(page.locator('button:has-text("Print to PDF")')).toBeVisible();
  });

  test("dispatches markz:print event when clicked", async ({ page }) => {
    // Listen for the custom event
    await page.evaluate(() => {
      window.__e2e_print_triggered = false;
      window.addEventListener("markz:print", () => {
        window.__e2e_print_triggered = true;
      });
    });

    await page.locator('button[aria-label="Copy as"]').click();
    await page.locator('button:has-text("Print to PDF")').click();
    await page.waitForTimeout(200);

    const triggered = await page.evaluate(() => window.__e2e_print_triggered);
    expect(triggered).toBe(true);
  });
});
