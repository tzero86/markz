import { test, expect } from "@playwright/test";
import { tauriMockInitFunc } from "./tauri-mock"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockInitFunc);
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

test.describe("Template browser", () => {
  test("opens and displays templates", async ({ page }) => {
    await page.locator('button[aria-label="New from Template"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    await expect(modal.locator(".template-card")).toHaveCount(3);
    await expect(modal.locator('h3:has-text("RFC")')).toBeVisible();
    await expect(modal.locator('h3:has-text("ADR")')).toBeVisible();
    await expect(modal.locator('h3:has-text("Getting Started")')).toBeVisible();
  });

  test("category tabs filter templates", async ({ page }) => {
    await page.locator('button[aria-label="New from Template"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Click Engineering category
    await modal.locator('button:has-text("Engineering")').click();
    await expect(modal.locator(".template-card")).toHaveCount(2);

    // Click Test category
    await modal.locator('button:has-text("Test")').click();
    await expect(modal.locator(".template-card")).toHaveCount(1);
    await expect(modal.locator('h3:has-text("Getting Started")')).toBeVisible();
  });

  test("search filters templates by name", async ({ page }) => {
    await page.locator('button[aria-label="New from Template"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    await modal.locator('input[placeholder="Search templates..."]').fill("RFC");
    await expect(modal.locator(".template-card")).toHaveCount(1);
    await expect(modal.locator('h3:has-text("RFC")')).toBeVisible();
  });

  test("search filters templates by description", async ({ page }) => {
    await page.locator('button[aria-label="New from Template"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    await modal.locator('input[placeholder="Search templates..."]').fill("Architecture Decision");
    await expect(modal.locator(".template-card")).toHaveCount(1);
    await expect(modal.locator('h3:has-text("ADR")')).toBeVisible();
  });

  test("using a template creates a new tab", async ({ page }) => {
    await page.locator('button[aria-label="New from Template"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    const rfcCard = modal.locator('.template-card').filter({ hasText: "RFC" });
    await rfcCard.locator('button:has-text("Use Template")').click();

    await expect(page.locator(".tab-bar .tab")).toHaveCount(2, { timeout: 3000 });
    await expect(page.locator('.tab:has-text("RFC")')).toBeVisible();
  });

  test("closes with Escape", async ({ page }) => {
    await page.locator('button[aria-label="New from Template"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
  });

  test("closes with backdrop click", async ({ page }) => {
    await page.locator('button[aria-label="New from Template"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });
    await page.locator('.modal-backdrop').click({ position: { x: 10, y: 10 } });
    await expect(modal).not.toBeVisible();
  });
});

test.describe("Save template dialog", () => {
  test("opens with pre-filled name from document title", async ({ page }) => {
    // First change the document title by loading a template
    await page.locator('button[aria-label="New from Template"]').click();
    const browser = page.locator('[role="dialog"]');
    await expect(browser).toBeVisible({ timeout: 3000 });
    await browser.locator('.template-card').filter({ hasText: "RFC" }).locator('button:has-text("Use Template")').click();
    await expect(page.locator('.tab:has-text("RFC")')).toBeVisible({ timeout: 3000 });

    // Now open save template dialog
    await page.locator('button[aria-label="Save as Template"]').click();
    const dialog = page.locator('[role="dialog"][aria-label="Save as Template"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(dialog.locator('input#tmpl-name')).toHaveValue("RFC");
  });

  test("save button is disabled when name is empty", async ({ page }) => {
    await page.locator('button[aria-label="Save as Template"]').click();
    const dialog = page.locator('[role="dialog"][aria-label="Save as Template"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    const saveBtn = dialog.locator('button:has-text("Save Template")');
    await expect(saveBtn).toBeDisabled();

    await dialog.locator('input#tmpl-name').fill("My Template");
    await expect(saveBtn).toBeEnabled();

    await dialog.locator('input#tmpl-name').fill("");
    await expect(saveBtn).toBeDisabled();
  });

  test("category dropdown has expected options", async ({ page }) => {
    await page.locator('button[aria-label="Save as Template"]').click();
    const dialog = page.locator('[role="dialog"][aria-label="Save as Template"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    const options = dialog.locator('select#tmpl-category option');
    await expect(options).toHaveCount(6);
    await expect(dialog.locator('select#tmpl-category')).toHaveValue("Custom");
  });

  test("cancel button closes dialog", async ({ page }) => {
    await page.locator('button[aria-label="Save as Template"]').click();
    const dialog = page.locator('[role="dialog"][aria-label="Save as Template"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await dialog.locator('button:has-text("Cancel")').click();
    await expect(dialog).not.toBeVisible();
  });

  test("closes with Escape", async ({ page }) => {
    await page.locator('button[aria-label="Save as Template"]').click();
    const dialog = page.locator('[role="dialog"][aria-label="Save as Template"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});
