import { test, expect } from "@playwright/test";
import { tauriMockScriptString } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  // Inject Tauri mock before the app loads
  await page.addInitScript(tauriMockScriptString);
  await page.goto("/");
  // Wait for the app to mount
  await page.waitForSelector(".app", { timeout: 10000 });
});

test("app loads with editor and preview panes", async ({ page }) => {
  await expect(page.locator(".editor-pane")).toBeVisible();
  await expect(page.locator(".preview-scroller")).toBeVisible();
  await expect(page.locator(".tab-bar")).toBeVisible();
  await expect(page.locator(".tab-bar .tab")).toHaveText(/Untitled/);
});

test("preview renders default content", async ({ page }) => {
  const preview = page.locator(".preview-scroller");
  // Wait for the debounced render to complete (80ms debounce + processing)
  await expect(preview.locator("text=Welcome to MarkZ")).toBeVisible({ timeout: 5000 });
  await expect(preview.locator("text=Live preview")).toBeVisible();
});

test.fixme("typing in editor updates preview", async ({ page }) => {
  // Use page.evaluate to directly set CodeMirror content (more reliable than keyboard typing)
  await page.locator(".cm-content").evaluate((el) => {
    const view = (el as any).cmView?.view;
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: "# Hello E2E\n\nThis is a test." },
      });
    } else {
      // Fallback: simulate input events
      el.textContent = "# Hello E2E\n\nThis is a test.";
      el.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }
  });

  const preview = page.locator(".preview-scroller");
  await expect(preview.locator("h1")).toHaveText("Hello E2E", { timeout: 5000 });
  await expect(preview.locator("p")).toHaveText("This is a test.");
});

test("New file button creates a new tab", async ({ page }) => {
  const newBtn = page.locator('button[aria-label="New file"]');
  await expect(newBtn).toBeVisible();
  await newBtn.click();

  // Should now have two tabs
  await expect(page.locator(".tab-bar .tab")).toHaveCount(2, { timeout: 3000 });
});

test("settings modal opens and has fixed height", async ({ page }) => {
  const settingsBtn = page.locator('button[aria-label="Settings"]');
  await settingsBtn.click();

  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible({ timeout: 3000 });

  // Modal should have a fixed height (not shrink when switching tabs)
  const box = await modal.boundingBox();
  expect(box?.height).toBeGreaterThan(600);

  // Switch to Help tab
  await modal.locator('button:has-text("Help")').click();
  const boxAfter = await modal.boundingBox();
  expect(Math.round(boxAfter?.height ?? 0)).toBe(Math.round(box?.height ?? 0));

  // Switch to About tab
  await modal.locator('button:has-text("About")').click();
  const boxAbout = await modal.boundingBox();
  expect(Math.round(boxAbout?.height ?? 0)).toBe(Math.round(box?.height ?? 0));

  // Close with Escape
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
});

test("theme toggle cycles through themes", async ({ page }) => {
  const themeBtn = page.locator('button[aria-label="Toggle theme"]');
  const html = page.locator("html");

  // Initial theme should be set
  await expect(html).toHaveAttribute("data-theme", /.*/);

  // Click to cycle
  await themeBtn.click();
  const themeAfter = await html.getAttribute("data-theme");
  expect(["dark", "light", "system"]).toContain(themeAfter);
});

test("no console errors on startup", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  // Reload to capture startup errors (re-inject mock first)
  await page.addInitScript(tauriMockScriptString);
  await page.reload();
  await page.waitForSelector(".app", { timeout: 10000 });
  await page.waitForTimeout(500);

  // Filter out known benign errors
  const criticalErrors = errors.filter(
    (e) => !e.includes("source map") && !e.includes("favicon")
  );
  expect(criticalErrors).toEqual([]);
});
