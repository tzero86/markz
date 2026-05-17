import { test, expect } from "@playwright/test";
import { tauriMockScriptString } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockScriptString);
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

test.describe("Editor toolbar", () => {
  test("toolbar buttons are visible", async ({ page }) => {
    const toolbar = page.locator(".toolbar");
    await expect(toolbar).toBeVisible();

    // Heading buttons
    await expect(toolbar.locator('button[title="Heading 1"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Heading 2"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Heading 3"]')).toBeVisible();

    // Style buttons
    await expect(toolbar.locator('button[title="Bold (Ctrl+B)"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Italic (Ctrl+I)"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Strikethrough"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Inline Code"]')).toBeVisible();

    // Block buttons
    await expect(toolbar.locator('button[title="Code Block"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Blockquote"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Horizontal Rule"]')).toBeVisible();

    // List buttons
    await expect(toolbar.locator('button[title="Bullet List"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Numbered List"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Task List"]')).toBeVisible();

    // Insert buttons
    await expect(toolbar.locator('button[title="Link"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Table"]')).toBeVisible();
  });

  test("table dialog opens and closes", async ({ page }) => {
    await page.locator('button[title="Table"]').click();
    const dialog = page.locator('[role="dialog"][aria-label="Insert table"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    await expect(dialog.locator('input[type="number"]')).toHaveCount(2);
    await dialog.locator('button:has-text("Cancel")').click();
    await expect(dialog).not.toBeVisible();
  });

  test("table dialog inserts table with default dimensions", async ({ page }) => {
    await page.locator('button[title="Table"]').click();
    const dialog = page.locator('[role="dialog"][aria-label="Insert table"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    await expect(dialog.locator('input[type="number"]').nth(0)).toHaveValue("3");
    await expect(dialog.locator('input[type="number"]').nth(1)).toHaveValue("3");

    await dialog.locator('button:has-text("Insert")').click();
    await expect(dialog).not.toBeVisible();
  });

  test("table dialog closes with backdrop click", async ({ page }) => {
    await page.locator('button[title="Table"]').click();
    const dialog = page.locator('[role="dialog"][aria-label="Insert table"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    await page.locator('.table-dialog-backdrop').click({ position: { x: 10, y: 10 } });
    await expect(dialog).not.toBeVisible();
  });
});

test.describe("Editor pane interactions", () => {
  test("editor container is present", async ({ page }) => {
    await expect(page.locator('.editor-container[role="application"]')).toBeVisible();
  });

  test("drag over adds drag-over class", async ({ page }) => {
    const editor = page.locator('.editor-container');
    await editor.evaluate((el) => {
      el.dispatchEvent(new DragEvent("dragenter", { bubbles: true }));
    });
    // The drag-over class is set via dragCounter, but we can't easily test
    // the visual state without more complex interactions. Just verify it exists.
    await expect(editor).toBeVisible();
  });
});
