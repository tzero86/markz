import { test, expect } from "@playwright/test";
import { tauriMockScriptString } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockScriptString);
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

test.describe("Tab management", () => {
  test("new tab button creates a new tab", async ({ page }) => {
    await expect(page.locator(".tab-bar .tab")).toHaveCount(1);
    await page.locator('button[aria-label="New tab"]').click();
    await expect(page.locator(".tab-bar .tab")).toHaveCount(2, { timeout: 3000 });
  });

  test("close tab button removes a tab", async ({ page }) => {
    // Create a second tab
    await page.locator('button[aria-label="New tab"]').click();
    await expect(page.locator(".tab-bar .tab")).toHaveCount(2, { timeout: 3000 });

    // Close the first tab
    const firstTab = page.locator(".tab-bar .tab").first();
    await firstTab.hover();
    await firstTab.locator('button[aria-label^="Close"]').click();
    await expect(page.locator(".tab-bar .tab")).toHaveCount(1, { timeout: 3000 });
  });

  test("closing last tab creates a fresh untitled tab", async ({ page }) => {
    // The only tab should be "Untitled"
    await expect(page.locator(".tab-bar .tab")).toHaveCount(1);
    await expect(page.locator(".tab-bar .tab").first()).toContainText("Untitled");

    // Close it
    const tab = page.locator(".tab-bar .tab").first();
    await tab.hover();
    await tab.locator('button[aria-label^="Close"]').click();

    // A fresh untitled tab should appear
    await expect(page.locator(".tab-bar .tab")).toHaveCount(1, { timeout: 3000 });
    await expect(page.locator(".tab-bar .tab").first()).toContainText("Untitled");
  });

  test("switching tabs updates the active tab", async ({ page }) => {
    // Create a second tab
    await page.locator('button[aria-label="New tab"]').click();
    await expect(page.locator(".tab-bar .tab")).toHaveCount(2, { timeout: 3000 });

    const tabs = page.locator(".tab-bar .tab");
    // First tab is active initially, new tab becomes active after creation
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");

    // Click first tab to switch back
    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "false");
  });

  test("dirty indicator appears on tab when content changes", async ({ page }) => {
    const tab = page.locator(".tab-bar .tab").first();
    // Initially no dirty dot
    await expect(tab.locator(".tab-dot")).not.toBeVisible();

    // Focus editor and type to make it dirty
    await page.locator(".cm-content").click();
    await page.keyboard.type("# Changed\n");

    // Dirty dot should appear
    await expect(tab.locator(".tab-dot")).toBeVisible({ timeout: 3000 });
  });

  test("title bar shows dirty dot when document is dirty", async ({ page }) => {
    const dirtyDot = page.locator('.dirty-dot[aria-label="Unsaved changes"]');
    await expect(dirtyDot).not.toBeVisible();

    // Focus editor and type to make it dirty
    await page.locator(".cm-content").click();
    await page.keyboard.type("# Modified\n");

    await expect(dirtyDot).toBeVisible({ timeout: 3000 });
  });

  test("tab context menu opens with Close, Close Others, Close All", async ({ page }) => {
    const tab = page.locator(".tab-bar .tab").first();
    await tab.click({ button: "right" });

    const menu = page.locator(".tab-context-menu");
    await expect(menu).toBeVisible();

    const items = menu.locator(".ctx-item");
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toContainText("Close");
    await expect(items.nth(1)).toContainText("Close Others");
    await expect(items.nth(2)).toContainText("Close All");
  });

  test("context menu Close closes the tab", async ({ page }) => {
    // Create a second tab
    await page.locator('button[aria-label="New tab"]').click();
    await expect(page.locator(".tab-bar .tab")).toHaveCount(2, { timeout: 3000 });

    // Right-click first tab and select Close
    await page.locator(".tab-bar .tab").first().click({ button: "right" });
    await page.getByRole("menuitem", { name: "Close", exact: true }).click();

    await expect(page.locator(".tab-bar .tab")).toHaveCount(1, { timeout: 3000 });
  });

  test("context menu Close Others keeps only clicked tab", async ({ page }) => {
    // Create two more tabs (3 total)
    await page.locator('button[aria-label="New tab"]').click();
    await page.locator('button[aria-label="New tab"]').click();
    await expect(page.locator(".tab-bar .tab")).toHaveCount(3, { timeout: 3000 });

    // Right-click first tab and select Close Others
    await page.locator(".tab-bar .tab").first().click({ button: "right" });
    await page.getByRole("menuitem", { name: "Close Others" }).click();

    await expect(page.locator(".tab-bar .tab")).toHaveCount(1, { timeout: 3000 });
    await expect(page.locator(".tab-bar .tab").first()).toHaveAttribute("aria-selected", "true");
  });

  test("context menu Close All leaves a fresh untitled tab", async ({ page }) => {
    // Create a second tab
    await page.locator('button[aria-label="New tab"]').click();
    await expect(page.locator(".tab-bar .tab")).toHaveCount(2, { timeout: 3000 });
    // Right-click any tab and select Close All
    await page.locator(".tab-bar .tab").first().click({ button: "right" });
    await page.getByRole("menuitem", { name: "Close All" }).click();
    await page.waitForTimeout(300);
    await expect(page.locator(".tab-bar .tab")).toHaveCount(1, { timeout: 3000 });
    await expect(page.locator(".tab-bar .tab").first()).toContainText("Untitled");
  });
});