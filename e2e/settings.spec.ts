import { test, expect, type Page } from "@playwright/test";
import { tauriMockScriptString } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockScriptString);
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

async function openSettings(page: Page) {
  await page.locator('button[aria-label="Settings"]').click();
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible({ timeout: 3000 });
  return modal;
}

test.describe("Settings modal", () => {
  test("opens on Settings tab by default", async ({ page }) => {
    const modal = await openSettings(page);
    const settingsTab = modal.locator('.tab').filter({ hasText: "Settings" });
    await expect(settingsTab).toHaveClass(/active/);
  });

  test("has all settings sections", async ({ page }) => {
    const modal = await openSettings(page);
    await expect(modal.locator('h3:has-text("Appearance")')).toBeVisible();
    await expect(modal.locator('h3:has-text("Editor")')).toBeVisible();
    await expect(modal.locator('h3:has-text("Layout")')).toBeVisible();
    await expect(modal.locator('h3:has-text("Accessibility")')).toBeVisible();
    await expect(modal.locator('h3:has-text("Auto Save")')).toBeVisible();
    await expect(modal.locator('h3:has-text("Export")')).toBeVisible();
  });

  test("export section has Pandoc path field", async ({ page }) => {
    const modal = await openSettings(page);
    const exportSection = modal.locator('.settings-section').filter({ hasText: 'Export' });
    await expect(exportSection).toBeVisible();
    // The Pandoc path input should be visible with empty default
    const pandocInput = exportSection.locator('input[type="text"]');
    await expect(pandocInput).toBeVisible();
    await expect(pandocInput).toHaveValue("");
  });

  test("appearance fields have correct initial values", async ({ page }) => {
    const modal = await openSettings(page);
    await expect(modal.locator('select#theme-select')).toHaveValue("dark");
    await expect(modal.locator('select#font-family')).toHaveValue("JetBrains Mono");
    await expect(modal.locator('input#font-size')).toHaveValue("14");
    await expect(modal.locator('input#line-height')).toHaveValue("1.7");
  });

  test("editor toggles have correct initial values", async ({ page }) => {
    const modal = await openSettings(page);
    const wordWrap = modal.locator('input[type="checkbox"]').nth(0);
    const showLineNumbers = modal.locator('input[type="checkbox"]').nth(1);
    const showMinimap = modal.locator('input[type="checkbox"]').nth(2);

    await expect(wordWrap).toBeChecked();
    await expect(showLineNumbers).toBeChecked();
    await expect(showMinimap).not.toBeChecked();
  });
  test("layout fields have correct initial values", async ({ page }) => {
    const modal = await openSettings(page);
    await expect(modal.locator('select#view-mode')).toHaveValue("split");
    await expect(modal.locator('select#split-direction')).toHaveValue("horizontal");
  });

  test("split direction dropdown changes value", async ({ page }) => {
    const modal = await openSettings(page);
    await modal.locator('select#split-direction').selectOption("vertical");
    await expect(modal.locator('select#split-direction')).toHaveValue("vertical");
  });

  test("custom dictionary section is present", async ({ page }) => {
    const modal = await openSettings(page);
    await expect(modal.locator('label:has-text("Custom dictionary")')).toBeVisible();
    await expect(modal.locator('textarea#custom-dictionary')).toBeVisible();
  });

  test("accessibility fields have correct initial values", async ({ page }) => {
    const modal = await openSettings(page);
    await expect(modal.locator('input#ui-font-size')).toHaveValue("14");
    await expect(modal.locator('input#preview-font-size')).toHaveValue("16");
    const reducedMotion = modal.locator('label:has-text("Reduced motion")').locator('input[type="checkbox"]');
    await expect(reducedMotion).not.toBeChecked();
  });

  test("auto save toggle reveals interval field", async ({ page }) => {
    const modal = await openSettings(page);
    const autoSaveToggle = modal.locator('label:has-text("Auto save")').locator('input[type="checkbox"]');
    await expect(modal.locator('input#auto-save-interval')).not.toBeVisible();

    await autoSaveToggle.click();
    await expect(modal.locator('input#auto-save-interval')).toBeVisible();
    await expect(modal.locator('input#auto-save-interval')).toHaveValue("30");

    await autoSaveToggle.click();
    await expect(modal.locator('input#auto-save-interval')).not.toBeVisible();
  });

  test("changing theme in settings dropdown updates selection", async ({ page }) => {
    const modal = await openSettings(page);
    await modal.locator('select#theme-select').selectOption("light");
    await expect(modal.locator('select#theme-select')).toHaveValue("light");
  });

  test("toggling minimap checkbox changes state", async ({ page }) => {
    const modal = await openSettings(page);
    const showMinimap = modal.locator('input[type="checkbox"]').nth(2);
    await expect(showMinimap).not.toBeChecked();
    await showMinimap.click();
    await expect(showMinimap).toBeChecked();
    await showMinimap.click();
    await expect(showMinimap).not.toBeChecked();
  });

  test("cancel button closes modal without saving", async ({ page }) => {
    const modal = await openSettings(page);
    await modal.locator('button:has-text("Cancel")').click();
    await expect(modal).not.toBeVisible();
  });

  test("backdrop click closes modal", async ({ page }) => {
    const modal = await openSettings(page);
    await page.locator('.modal-backdrop').click({ position: { x: 10, y: 10 } });
    await expect(modal).not.toBeVisible();
  });
});

test.describe("Help tab", () => {
  test("shows keyboard shortcuts list", async ({ page }) => {
    await page.locator('button[aria-label="Help"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    const helpTab = modal.locator('.tab').filter({ hasText: "Help" });
    await expect(helpTab).toHaveClass(/active/);

    await expect(modal.locator(".shortcut-row")).toHaveCount(14);
    await expect(modal.locator(".shortcut-row").first()).toBeVisible();
  });
});

test.describe("About tab", () => {
  test("displays app version and info", async ({ page }) => {
    await page.locator('button[aria-label="Help"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    await modal.locator('button:has-text("About")').click();

    await expect(modal.locator('.logo-text:has-text("MarkZ")')).toBeVisible();
    await expect(modal.locator('.logo-version')).toContainText("v0.1.12");
    await expect(modal.locator('p:has-text("dual-pane Markdown editor")')).toBeVisible();
  });

  test("shows features list", async ({ page }) => {
    await page.locator('button[aria-label="Help"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    await modal.locator('button:has-text("About")').click();

    await expect(modal.locator('.about-features li')).toHaveCount(6);
    await expect(modal.locator('li:has-text("Live preview")')).toBeVisible();
    await expect(modal.locator('li:has-text("Export to JIRA")')).toBeVisible();
  });

  test("shows tech stack badges", async ({ page }) => {
    await page.locator('button[aria-label="Help"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    await modal.locator('button:has-text("About")').click();

    const badges = modal.locator('.tech-badge');
    await expect(badges).toHaveCount(6);
    await expect(modal.locator('.tech-badge:has-text("Tauri v2")')).toBeVisible();
    await expect(modal.locator('.tech-badge:has-text("Svelte 5")')).toBeVisible();
    await expect(modal.locator('.tech-badge:has-text("Rust")')).toBeVisible();
  });

  test("shows credits section", async ({ page }) => {
    await page.locator('button[aria-label="Help"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    await modal.locator('button:has-text("About")').click();

    await expect(modal.locator('.about-credits')).toBeVisible();
    await expect(modal.locator('a[href="https://github.com/tzero86"]')).toBeVisible();
  });

  test("update check button is present and clickable", async ({ page }) => {
    await page.locator('button[aria-label="Help"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    await modal.locator('button:has-text("About")').click();

    const updateBtn = modal.locator('.update-btn').filter({ hasText: /Check for Updates/ });
    await expect(updateBtn).toBeVisible();
    await expect(updateBtn).toBeEnabled();
  });
});
