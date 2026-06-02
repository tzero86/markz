import { test, expect } from "@playwright/test";
import { tauriMockScriptString } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockScriptString);
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

test("app container and body are not scrollable", async ({ page }) => {
  const bodyScroll = await page.evaluate(() => {
    const html = document.documentElement;
    const bodyEl = document.body;
    const app = document.querySelector(".app");
    return {
      htmlOverflow: getComputedStyle(html).overflow,
      bodyOverflow: getComputedStyle(bodyEl).overflow,
      appOverflow: app ? getComputedStyle(app).overflow : "unknown",
    };
  });
  expect(bodyScroll.htmlOverflow).toBe("hidden");
  expect(bodyScroll.bodyOverflow).toBe("hidden");
  expect(bodyScroll.appOverflow).toBe("hidden");
});

test("editor scroller has overflow auto CSS", async ({ page }) => {
  const cmScroller = page.locator(".cm-scroller");
  await expect(cmScroller).toBeVisible();

  const overflowY = await cmScroller.evaluate(
    (el: HTMLElement) => getComputedStyle(el).overflowY
  );
  expect(overflowY).toBe("auto");
});

test("preview scroller has overflow auto CSS", async ({ page }) => {
  const previewScroller = page.locator(".preview-scroller");
  await expect(previewScroller).toBeVisible();

  const overflow = await previewScroller.evaluate(
    (el) => getComputedStyle(el).overflow
  );
  expect(overflow).toBe("auto");
});

test("arrow key navigation in editor does not scroll the page", async ({
  page,
}) => {
  // Click the editor to focus it
  await page.locator(".cm-content").click();

  // Press arrow down multiple times
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("ArrowDown");
  }
  await page.waitForTimeout(300);

  // Check that NO outer containers scrolled
  const afterPos = await page.evaluate(() => ({
    bodyScroll: document.body.scrollTop,
    htmlScroll: document.documentElement.scrollTop,
    appScroll: document.querySelector(".app")?.scrollTop ?? 0,
  }));

  expect(afterPos.bodyScroll).toBe(0);
  expect(afterPos.htmlScroll).toBe(0);
  expect(afterPos.appScroll).toBe(0);

  // The editor cursor should have moved (verify via selection state)
  const cursorPos = await page.evaluate(() => {
    const view = (window as any).EditorView?.findFromDOM(
      document.querySelector(".cm-content")
    );
    return view ? view.state.selection.main.head : -1;
  });
  expect(cursorPos).toBeGreaterThan(0);
});

test("tab key in editor does not scroll the page", async ({ page }) => {
  await page.locator(".cm-content").click();
  await page.keyboard.press("Tab");
  await page.waitForTimeout(100);

  const afterAppScroll = await page.evaluate(
    () => document.querySelector(".app")?.scrollTop ?? 0
  );
  expect(afterAppScroll).toBe(0);
});

test("editing content updates each tab's editor state correctly", async ({
  page,
}) => {
  // Helper to get current editor content
  async function getEditorContent(): Promise<string> {
    return page.evaluate(() => {
      const view = (window as any).EditorView?.findFromDOM(
        document.querySelector(".cm-content")
      );
      return view ? view.state.doc.toString() : "";
    });
  }

  async function setEditorContent(text: string) {
    await page.evaluate((t) => {
      const view = (window as any).EditorView?.findFromDOM(
        document.querySelector(".cm-content")
      );
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: t },
        });
      }
    }, text);
  }

  // Set first document content
  await setEditorContent("# First Doc\n\nContent A.");
  await page.waitForTimeout(300);
  const content1 = await getEditorContent();
  expect(content1).toContain("First Doc");

  // Create a new tab and set its content
  await page.locator('button[aria-label="New tab"]').click();
  await page.waitForTimeout(300);
  await setEditorContent("# Second Doc\n\nContent B.");
  await page.waitForTimeout(300);
  const content2 = await getEditorContent();
  expect(content2).toContain("Second Doc");

  // Switch back to first tab
  const tabs = page.locator(".tab-bar .tab");
  await tabs.nth(0).click();
  await page.waitForTimeout(500);
  const content1b = await getEditorContent();
  expect(content1b).toContain("First Doc");
  expect(content1b).not.toContain("Second Doc");
});
