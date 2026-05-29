import { test, expect } from "@playwright/test";
import { tauriMockScriptString } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockScriptString);
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

test.describe("Outline sidebar", () => {
  test("is visible by default and shows heading outline", async ({ page }) => {
    const sidebar = page.locator(".sidebar");
    await expect(sidebar).toBeVisible();

    // Default content has "What Makes MarkZ Different" heading
    await expect(sidebar.locator('.toc-link:has-text("What Makes MarkZ Different")')).toBeVisible();
  });

  test("shows empty state when no headings", async ({ page }) => {
    // Replace editor content with plain text (no headings)
    await page.locator(".cm-content").click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("No headings here.");

    const sidebar = page.locator(".sidebar");
    await expect(sidebar.locator('.empty:has-text("No headings")')).toBeVisible({ timeout: 3000 });
  });

  test("Ctrl+B collapses and expands sidebar panel", async ({ page }) => {
    await expect(page.locator(".sidebar")).toBeVisible();

    await page.keyboard.press("Control+b");
    await expect(page.locator(".sidebar")).toHaveCount(0);

    await page.keyboard.press("Control+b");
    await expect(page.locator(".sidebar")).toBeVisible();
  });
});

test.describe("Preview pane format tabs", () => {
  test("default format is HTML", async ({ page }) => {
    const htmlTab = page.locator('.format-tab').filter({ hasText: "HTML" });
    await expect(htmlTab).toHaveClass(/active/);
  });

  test("switching to JIRA shows escaped output", async ({ page }) => {
    await page.locator('.format-tab').filter({ hasText: "JIRA" }).click();
    const jiraTab = page.locator('.format-tab').filter({ hasText: "JIRA" });
    await expect(jiraTab).toHaveClass(/active/);

    const preview = page.locator(".preview-scroller");
    await expect(preview.locator(".text-format code").first()).toContainText("h1. Welcome to MarkZ");
  });

  test("switching to Confluence shows escaped output", async ({ page }) => {
    await page.locator('.format-tab').filter({ hasText: "Confluence" }).click();
    const tab = page.locator('.format-tab').filter({ hasText: "Confluence" });
    await expect(tab).toHaveClass(/active/);

    const preview = page.locator(".preview-scroller");
    await expect(preview.locator(".text-format code").first()).toContainText("Welcome to MarkZ");
  });

  test("switching to Slack shows escaped output", async ({ page }) => {
    await page.locator('.format-tab').filter({ hasText: "Slack" }).click();
    const tab = page.locator('.format-tab').filter({ hasText: "Slack" });
    await expect(tab).toHaveClass(/active/);

    const preview = page.locator(".preview-scroller");
    await expect(preview.locator(".text-format code").first()).toContainText("*Welcome to MarkZ*");
  });

  test("switching to GitHub shows markdown output", async ({ page }) => {
    await page.locator('.format-tab').filter({ hasText: "GitHub" }).click();
    const tab = page.locator('.format-tab').filter({ hasText: "GitHub" });
    await expect(tab).toHaveClass(/active/);

    const preview = page.locator(".preview-scroller");
    await expect(preview.locator(".text-format code").first()).toContainText("Welcome to MarkZ");
  });

  test("copy output button shows feedback", async ({ page }) => {
    const copyBtn = page.locator('button[aria-label="Copy output"]');
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();

    // Button should show success state
    await page.waitForTimeout(100);
    await expect(page.locator('button[aria-label="Copied!"]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.action-btn.success')).toBeVisible();
  });
});
