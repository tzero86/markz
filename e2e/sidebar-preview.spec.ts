import { test, expect } from "@playwright/test";
import { tauriMockScriptString } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockScriptString);
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
});

test.describe("Preview pane Copy dropdown", () => {
  test("preview renders HTML by default", async ({ page }) => {
    const previewContent = page.locator(".preview-content");
    await expect(previewContent).toBeVisible();
    await expect(previewContent.locator("h1").first()).toContainText("Welcome to MarkZ");
  });

  test("copy dropdown opens and shows format options", async ({ page }) => {
    const copyBtn = page.locator('button[aria-label="Copy"]');
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();

    const dropdown = page.locator(".copy-dropdown-menu");
    await expect(dropdown).toBeVisible();

    await expect(dropdown.locator('.copy-dropdown-item:has-text("Copy as HTML")')).toBeVisible();
    await expect(dropdown.locator('.copy-dropdown-item:has-text("Copy as JIRA")')).toBeVisible();
    await expect(dropdown.locator('.copy-dropdown-item:has-text("Copy as Confluence")')).toBeVisible();
    await expect(dropdown.locator('.copy-dropdown-item:has-text("Copy as Slack")')).toBeVisible();
    await expect(dropdown.locator('.copy-dropdown-item:has-text("Copy as GitHub")')).toBeVisible();
  });

  test("copy button shows feedback after clicking", async ({ page }) => {
    const copyBtn = page.locator('button[aria-label="Copy"]');
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();

    const dropdown = page.locator(".copy-dropdown-menu");
    await expect(dropdown).toBeVisible();

    // Click the first format option (HTML)
    await dropdown.locator(".copy-dropdown-item").first().click();

    // Button should show success state
    await expect(page.locator(".action-btn.success")).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.action-btn .action-label:has-text("Copied")')).toBeVisible();
  });
});
