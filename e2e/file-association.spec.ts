import { test, expect } from "@playwright/test";
import { tauriMockInitFunc } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockInitFunc);
});

test.describe("File association open", () => {
  test("opens a Markdown file passed via take_pending_open on startup", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem("__e2e_pending_open", JSON.stringify(["/reports/launch.md"]));
      localStorage.setItem("__e2e_file_contents", JSON.stringify({
        "/reports/launch.md": "# Launch Report\n\nAll systems go.",
      }));
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    const tabs = page.locator(".tab-bar .tab");
    // The default welcome tab remains, and the OS-opened file gets a new tab.
    await expect(tabs).toHaveCount(2, { timeout: 5000 });
    await expect(tabs.last()).toContainText("launch.md");

    const editorText = await page.evaluate(() => {
      const view = (window as any).EditorView?.findFromDOM(document.querySelector(".cm-content"));
      return view ? view.state.doc.toString() : "";
    });
    expect(editorText).toContain("Launch Report");
  });

  test("opens a Markdown file when the open-file event fires while running", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem("__e2e_file_contents", JSON.stringify({
        "/notes/todo.md": "# Todo\n\n- [ ] Ship it",
      }));
    });

    // Give the App onMount listener time to register.
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      (window as any).__markz_emit_event("open-file", "/notes/todo.md");
    });

    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(2, { timeout: 5000 });
    await expect(tabs.last()).toContainText("todo.md");
  });
});
