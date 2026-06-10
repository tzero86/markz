import { test, expect, type Page } from "@playwright/test";
import { tauriMockInitFunc } from "./tauri-mock"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockInitFunc);
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
  test("opens on General category by default", async ({ page }) => {
    const modal = await openSettings(page);
    const generalItem = modal.locator('.sidebar-item').filter({ hasText: "General" });
    await expect(generalItem).toHaveClass(/active/);
  });

  test("has general settings sections", async ({ page }) => {
    const modal = await openSettings(page);
    await expect(modal.locator('h3:has-text("Appearance")')).toBeVisible();
    await expect(modal.locator('h3:has-text("Layout")')).toBeVisible();
    await expect(modal.locator('h3:has-text("Accessibility")')).toBeVisible();
  });

  test("navigating to Editor category shows editor sections", async ({ page }) => {
    const modal = await openSettings(page);
    await modal.locator('.sidebar-item').filter({ hasText: "Editor" }).click();
    await expect(modal.locator('h3:has-text("Font")')).toBeVisible();
    await expect(modal.locator('h3:has-text("Editor")')).toBeVisible();
    await expect(modal.locator('h3:has-text("Custom Dictionary")')).toBeVisible();
  });

  test("navigating to Advanced category shows export section with Pandoc path field", async ({ page }) => {
    const modal = await openSettings(page);
    await modal.locator('.sidebar-item').filter({ hasText: "Advanced" }).click();
    const exportSection = modal.locator('.settings-section').filter({ hasText: 'Export' });
    await expect(exportSection).toBeVisible();
    const pandocInput = exportSection.locator('input[type="text"]');
    await expect(pandocInput).toBeVisible();
    await expect(pandocInput).toHaveValue("");
  });

  test("General category has theme field with correct initial value", async ({ page }) => {
    const modal = await openSettings(page);
    await expect(modal.locator('select#theme-select')).toHaveValue("dark");
  });

  test("Editor category has font fields with correct initial values", async ({ page }) => {
    const modal = await openSettings(page);
    await modal.locator('.sidebar-item').filter({ hasText: "Editor" }).click();
    await expect(modal.locator('select#font-family')).toHaveValue("JetBrains Mono");
    await expect(modal.locator('input#font-size')).toHaveValue("14");
    await expect(modal.locator('input#line-height')).toHaveValue("1.7");
  });

  test("editor behavior toggles have correct initial values", async ({ page }) => {
    const modal = await openSettings(page);
    await modal.locator('.sidebar-item').filter({ hasText: "Editor" }).click();
    const checkboxes = modal.locator('input[type="checkbox"]');
    await expect(checkboxes.nth(0)).toBeChecked(); // word wrap
    await expect(checkboxes.nth(1)).toBeChecked(); // show line numbers
    await expect(checkboxes.nth(2)).not.toBeChecked(); // minimap
    await expect(checkboxes.nth(3)).toBeChecked(); // auto open folder
    await expect(checkboxes.nth(4)).toBeChecked(); // spellcheck
    await expect(checkboxes.nth(5)).not.toBeChecked(); // vim mode
  });

  test("vim mode checkbox toggles", async ({ page }) => {
    const modal = await openSettings(page);
    await modal.locator('.sidebar-item').filter({ hasText: "Editor" }).click();
    const vimMode = modal.locator('input[type="checkbox"]').nth(5);
    await expect(vimMode).not.toBeChecked();
    await vimMode.click();
    await expect(vimMode).toBeChecked();
    await vimMode.click();
    await expect(vimMode).not.toBeChecked();
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
    await modal.locator('.sidebar-item').filter({ hasText: "Editor" }).click();
    await expect(modal.locator('h3:has-text("Custom Dictionary")')).toBeVisible();
    await expect(modal.locator('textarea#custom-dictionary')).toBeVisible();
  });

  test("accessibility fields have correct initial values", async ({ page }) => {
    const modal = await openSettings(page);
    await expect(modal.locator('input#ui-font-size')).toHaveValue("14");
    const reducedMotion = modal.locator('label:has-text("Reduced motion")').locator('input[type="checkbox"]');
    await expect(reducedMotion).not.toBeChecked();
  });

  test("preview fields have correct initial values", async ({ page }) => {
    const modal = await openSettings(page);
    await modal.locator('.sidebar-item').filter({ hasText: "Preview" }).click();
    await expect(modal.locator('input#preview-font-size')).toHaveValue("16");
  });

  test("auto save toggle reveals interval field", async ({ page }) => {
    const modal = await openSettings(page);
    await modal.locator('.sidebar-item').filter({ hasText: "Advanced" }).click();
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
    await modal.locator('.sidebar-item').filter({ hasText: "Editor" }).click();
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

test.describe("Shortcuts category (Help)", () => {
  test("shows keyboard shortcuts list", async ({ page }) => {
    await page.locator('button[aria-label="Help"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    const shortcutsItem = modal.locator('.sidebar-item').filter({ hasText: "Shortcuts" });
    await expect(shortcutsItem).toHaveClass(/active/);

    await expect(modal.locator(".shortcut-row")).toHaveCount(16);
    await expect(modal.locator(".shortcut-row").first()).toBeVisible();
  });
});

test.describe("About category", () => {
  async function openAbout(page: Page) {
    await page.locator('button[aria-label="Help"]').click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });
    await modal.locator('.sidebar-item').filter({ hasText: "About" }).click();
    return modal;
  }

  test("displays app version and info", async ({ page }) => {
    const modal = await openAbout(page);
    await expect(modal.locator('.logo-text:has-text("MarkZ")')).toBeVisible();
    await expect(modal.locator('.logo-version')).toContainText("v0.1.12");
    await expect(modal.locator('.about-description')).toBeVisible();
  });

  test("shows tech stack badges", async ({ page }) => {
    const modal = await openAbout(page);
    const badges = modal.locator('.tech-badge');
    await expect(badges).toHaveCount(6);
    await expect(modal.locator('.tech-badge:has-text("Tauri")')).toBeVisible();
    await expect(modal.locator('.tech-badge:has-text("Svelte 5")')).toBeVisible();
    await expect(modal.locator('.tech-badge:has-text("Rust")')).toBeVisible();
  });

  test("shows credits section", async ({ page }) => {
    const modal = await openAbout(page);
    await expect(modal.locator('.about-credits')).toBeVisible();
    await expect(modal.locator('a[href="https://github.com/tzero86"]')).toBeVisible();
  });

  test("shows GitHub link", async ({ page }) => {
    const modal = await openAbout(page);
    const link = modal.locator('a[href="https://github.com/tzero86/markz"]');
    await expect(link).toBeVisible();
    await expect(link).toContainText("GitHub");
  });

  test("update check button is present and clickable", async ({ page }) => {
    const modal = await openAbout(page);
    const updateBtn = modal.locator('.update-btn').filter({ hasText: /Check/ });
    await expect(updateBtn).toBeVisible();
    await expect(updateBtn).toBeEnabled();
  });
});
