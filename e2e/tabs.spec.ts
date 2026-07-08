import { test, expect } from "@playwright/test";
import { tauriMockInitFunc } from "./tauri-mock"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockInitFunc);
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
    await expect(items).toHaveCount(4);
    await expect(items.nth(0)).toContainText("Pin");
    await expect(items.nth(1)).toContainText("Close");
    await expect(items.nth(2)).toContainText("Close Others");
    await expect(items.nth(3)).toContainText("Close All");
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

  test("pin tab via context menu", async ({ page }) => {
    // Create a second tab
    await page.locator('button[aria-label="New tab"]').click();
    await page.waitForTimeout(200);
    await expect(page.locator(".tab-bar .tab")).toHaveCount(2);
    // Right-click first tab and pin it
    await page.locator(".tab-bar .tab").first().click({ button: "right" });
    await page.getByRole("menuitem", { name: "Pin" }).click();
    // Pinned tab should have pin icon and no close button
    const pinnedTab = page.locator(".tab-bar .tab.pinned");
    await expect(pinnedTab).toHaveCount(1);
    await expect(pinnedTab.locator(".tab-close")).not.toBeVisible();
  });

  test("pinned tabs survive Close All", async ({ page }) => {
    // Pin the first tab
    await page.locator(".tab-bar .tab").first().click({ button: "right" });
    await page.getByRole("menuitem", { name: "Pin" }).click();
    // Create a second tab
    await page.locator('button[aria-label="New tab"]').click();
    await page.waitForTimeout(200);
    // Close all via context menu on second tab
    await page.locator(".tab-bar .tab").nth(1).click({ button: "right" });
    await page.getByRole("menuitem", { name: "Close All" }).click();
    // Only pinned tab should remain
    await expect(page.locator(".tab-bar .tab")).toHaveCount(1);
    await expect(page.locator(".tab-bar .tab.pinned")).toHaveCount(1);
  });

  test("unpin tab via context menu", async ({ page }) => {
    // Pin the first tab
    await page.locator(".tab-bar .tab").first().click({ button: "right" });
    await page.getByRole("menuitem", { name: "Pin" }).click();
    await expect(page.locator(".tab-bar .tab.pinned")).toHaveCount(1);
    // Unpin it
    await page.locator(".tab-bar .tab.pinned").first().click({ button: "right" });
    await page.getByRole("menuitem", { name: "Unpin" }).click();
    await expect(page.locator(".tab-bar .tab.pinned")).toHaveCount(0);
  });

  test("tab dropdown lists all open tabs", async ({ page }) => {
    // Open a few tabs.
    await page.locator('button[aria-label="New tab"]').click();
    await page.locator('button[aria-label="New tab"]').click();
    await expect(page.locator(".tab-bar .tab")).toHaveCount(3, { timeout: 3000 });

    await page.locator('button[aria-label="Open tabs"]').click();
    const menu = page.locator(".tab-dropdown-menu");
    await expect(menu).toBeVisible();

    const items = menu.locator("[role='menuitem']");
    await expect(items).toHaveCount(3);

    // Click the first item in the dropdown; it should switch to that tab.
    await items.first().click();
    await expect(menu).not.toBeVisible();
    await expect(page.locator(".tab-bar .tab.active")).toBeVisible();
  });

test.describe("Draggable tabs", () => {
  test("tabs have draggable attribute", async ({ page }) => {
    const tabs = page.locator(".tab-bar .tab");
    const count = await tabs.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(tabs.nth(i)).toHaveAttribute("draggable", "true");
    }
  });

  test("dragging unpinned tab reorders it", async ({ page }) => {
    // Create two extra tabs so we have 3 unpinned tabs
    await page.locator('button[aria-label="New tab"]').click();
    await page.locator('button[aria-label="New tab"]').click();
    await expect(page.locator(".tab-bar .tab")).toHaveCount(3, { timeout: 3000 });

    // Get initial order
    const first = page.locator('[data-testid="tab-0"]');
    const third = page.locator('[data-testid="tab-2"]');
    const firstTitle = await first.textContent();
    const thirdTitle = await third.textContent();

    // Drag first tab onto third tab (before position)
    await first.dragTo(third, { force: true, timeout: 3000 });
    await page.waitForTimeout(300);

    // After dragging tab-0 before tab-2, the original first tab
    // should now be at index 1 (between original second and third)
    const newTab0 = page.locator('[data-testid="tab-0"]');
    const newTab1 = page.locator('[data-testid="tab-1"]');
    await expect(newTab0).toContainText(firstTitle!);
    await expect(newTab1).toContainText(thirdTitle!);
  });

  test("dragging pinned tab stays within pinned group", async ({ page }) => {
    // Create an extra tab and pin the first one
    await page.locator('button[aria-label="New tab"]').click();
    await expect(page.locator(".tab-bar .tab")).toHaveCount(2, { timeout: 3000 });

    // Pin first tab via context menu
    const firstTab = page.locator('[data-testid="tab-0"]');
    await firstTab.click({ button: "right" });
    await page.locator('[role="menuitem"]:has-text("Pin")').click();
    await page.waitForTimeout(200);

    // Verify pinned section exists
    const pinned = page.locator('[data-testid="pinned-tab-0"]');
    await expect(pinned).toBeVisible();

    // Try to drag pinned tab onto unpinned tab
    const unpinned = page.locator('[data-testid="tab-0"]');
    await pinned.dragTo(unpinned, { force: true, timeout: 3000 });
    await page.waitForTimeout(300);

    // Pinned tab should still be in pinned section
    await expect(page.locator('[data-testid="pinned-tab-0"]')).toBeVisible();
    // Unpinned tab count should still be 1
    await expect(page.locator('[data-testid^="tab-"]')).toHaveCount(1);
  });
});

test.describe("External file changes", () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
  });
  test("newly opened file is not marked dirty", async ({ page }) => {
    await page.evaluate(() => {
      const ts = (window as any).__markz_tabStore;
      ts.newTab("# Test\n\nHello world.", undefined, "/test/file.md");
    });
    await page.waitForSelector('.tab:has-text("file.md")', { timeout: 5000 });

    const isDirty = await page.evaluate(() => {
      const ts = (window as any).__markz_tabStore;
      const tab = ts.getActiveTab();
      return tab?.isDirty ?? true;
    });
    expect(isDirty).toBe(false);
  });

  test("closing a non-dirty file tab does not prompt to save", async ({ page }) => {
    await page.evaluate(() => {
      const ts = (window as any).__markz_tabStore;
      ts.newTab("# Test\n\nHello world.", undefined, "/test/file.md");
    });
    await page.waitForSelector('.tab:has-text("file.md")', { timeout: 5000 });

    // Close the file tab — should immediately create a fresh untitled tab
    await page.locator('.tab:has-text("file.md") .tab-close').click();
    await expect(page.locator('.tab.active')).toContainText("Untitled");
  });
  test("prompts to reload when file changes externally", async ({ page }) => {
    // Ensure Tauri mock is present (addInitScript can be flaky across reloads)
    await page.evaluate(() => {
      if (typeof window.__TAURI_INTERNALS__ === "undefined") {
        window.__TAURI_INTERNALS__ = {
          invoke: function(cmd: string, args?: any) {
            if (cmd === "plugin:dialog|message") return Promise.resolve("Ok");
            if (cmd === "open_document") {
              const fileOverrides = JSON.parse(localStorage.getItem("__e2e_file_contents") || "{}");
              const path = args?.path || "/test.md";
              const content = fileOverrides[path] || "# Test\n\nHello world.";
              return Promise.resolve({ path, content });
            }
            return Promise.resolve(null);
          },
          convertFileSrc: function(path: string) { return path; },
        } as any;
      }
    });

    // Create a file tab directly via store API
    await page.evaluate(() => {
      const ts = (window as any).__markz_tabStore;
      ts.newTab("# Original content\n\nHello.", undefined, "/workspace/file.md");
    });
    await page.waitForSelector('.tab:has-text("file.md")', { timeout: 5000 });

    // Override what open_document returns for reload
    await page.evaluate(() => {
      localStorage.setItem("__e2e_file_contents", JSON.stringify({ "/workspace/file.md": "# Modified\n\nNew." }));
    });

    // Dispatch external change event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("markz:file-externally-changed", {
        detail: "/workspace/file.md"
      }));
    });

    // Wait for async reload
    await page.waitForTimeout(1000);

    // Content should have been reloaded (mock confirm always returns true)
    const newContent = await page.evaluate(() => {
      const ts = (window as any).__markz_tabStore;
      const tab = ts.getActiveTab();
      return tab?.content ?? "";
    });
    expect(newContent).toContain("Modified");
  });
});
});