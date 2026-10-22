import { test, expect } from "@playwright/test";
import { tauriMockInitFunc } from "./tauri-mock";

const PREVIEW_HTML = `<table data-table-index="0"><thead><tr><th>A1</th></tr></thead><tbody><tr><td>A2</td></tr></tbody></table>
<table data-table-index="1"><thead><tr><th>B1</th></tr></thead><tbody><tr><td>B2</td></tr></tbody></table>`;

interface TableSource {
  markdown: string;
  start: number;
  end: number;
  count: number;
}

interface TauriInternals {
  invoke: (cmd: string, args?: unknown) => Promise<unknown>;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockInitFunc);
  // Wrapper must be registered AFTER the mock so it runs second and can delegate.
  await page.addInitScript(({ previewHtml }: { previewHtml: string }) => {
    // Global installed by tauriMockInitFunc; Playwright serializes this fn.
    const tauriWindow = window as unknown as { __TAURI_INTERNALS__?: TauriInternals };
    const internals = tauriWindow.__TAURI_INTERNALS__;
    if (!internals) throw new Error("Tauri mock not installed");
    const orig = internals.invoke;
    const sources: Record<number, TableSource> = {
      0: { markdown: "| A1 |\n|---|\n| A2 |", start: 0, end: 20, count: 2 },
      1: { markdown: "| B1 |\n|---|\n| B2 |", start: 21, end: 41, count: 2 },
    };
    internals.invoke = (cmd: string, args?: unknown) => {
      if (cmd === "render_preview") return Promise.resolve(previewHtml);
      if (cmd === "get_table_source") {
        let index = 0;
        if (args && typeof args === "object" && "index" in args && typeof args.index === "number") {
          index = args.index;
        }
        return Promise.resolve(sources[index]);
      }
      return orig(cmd, args);
    };
  }, { previewHtml: PREVIEW_HTML });
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

test("double-clicking the second preview table opens the second table", async ({ page }) => {
  const tables = page.locator(".preview-scroller table");
  await expect(tables).toHaveCount(2);
  await tables.nth(1).dblclick();
  const modal = page.locator(".table-editor");
  await expect(modal).toBeVisible({ timeout: 3000 });
  await expect(modal.locator('input[type="text"]').nth(0)).toHaveValue("B1");
  await expect(modal.locator('input[type="text"]').nth(1)).toHaveValue("B2");
});
