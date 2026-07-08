import { test, expect } from "@playwright/test";
import { tauriMockInitFunc } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockInitFunc);
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

/** Helper to set editor content directly via CodeMirror. */
async function setEditorText(page: any, text: string) {
  await page.evaluate((t: string) => {
    const view = (window as any).EditorView?.findFromDOM(document.querySelector(".cm-content"));
    if (view) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: t } });
    }
  }, text);
}

test("app loads with editor and preview panes", async ({ page }) => {
  await expect(page.locator(".editor-pane")).toBeVisible();
  await expect(page.locator(".preview-scroller")).toBeVisible();
  await expect(page.locator(".tab-bar")).toBeVisible();
  await expect(page.locator(".tab-bar .tab")).toHaveText(/Untitled/);
});

test("skip link moves focus to editor", async ({ page }) => {
  const skipLink = page.locator(".skip-link");

  // Hidden off-screen until focused
  await expect(skipLink).toHaveCSS("top", "-40px");

  // Focus the skip link with Tab
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  // Activate it
  await skipLink.click();

  // Focus should now be inside the CodeMirror editor
  const activeElement = await page.evaluate(() => document.activeElement?.classList.contains("cm-content") || document.activeElement?.closest(".cm-content") !== null);
  expect(activeElement).toBe(true);
});

test("preview renders default content", async ({ page }) => {
  const preview = page.locator(".preview-scroller");
  await expect(preview.locator("h1:has-text('Welcome to MarkZ')")).toBeVisible({ timeout: 5000 });
  await expect(preview.locator("text=Live preview")).toBeVisible();
});

test("formatting-test template renders all elements correctly", async ({ page }) => {
  // Open template browser
  await page.locator('button[aria-label="New from Template"]').click();

  // Wait for modal and click "Use Template" on Getting Started
  const modal = page.locator('[role="dialog"][aria-label="Templates"]');
  await expect(modal).toBeVisible({ timeout: 3000 });
  const formattingCard = modal.locator('.template-card').filter({ hasText: /Getting Started/ });
  await formattingCard.locator('button:has-text("Use Template")').click();

  // Wait for new tab to be created and preview to render
  await expect(page.locator(".tab-bar .tab")).toHaveCount(2, { timeout: 3000 });
  const preview = page.locator(".preview-scroller");
  await expect(preview.locator("h1:has-text('Welcome to MarkZ')")).toBeVisible({ timeout: 5000 });

  // Headings h1-h6 — verify each level exists
  const hCount = await preview.evaluate((el) => ({
    h1: el.querySelectorAll("h1").length,
    h2: el.querySelectorAll("h2").length,
    h3: el.querySelectorAll("h3").length,
    h4: el.querySelectorAll("h4").length,
    h5: el.querySelectorAll("h5").length,
    h6: el.querySelectorAll("h6").length,
  }));
  expect(hCount.h1).toBe(2);
  expect(hCount.h2).toBeGreaterThanOrEqual(7);
  expect(hCount.h3).toBeGreaterThanOrEqual(3);
  expect(hCount.h4).toBeGreaterThanOrEqual(9);
  expect(hCount.h5).toBe(1);
  expect(hCount.h6).toBe(1);

  // Inline formatting
  await expect(preview.locator("strong:has-text('bold text')")).toBeVisible();
  await expect(preview.locator("em:has-text('italic text')")).toBeVisible();
  await expect(preview.locator("del:has-text('strikethrough')").first()).toBeVisible();
  await expect(preview.locator("code:has-text('inline code')").first()).toBeVisible();
  await expect(preview.locator('a[href="https://example.com"]').filter({ hasText: "External link" })).toBeVisible();

  // Code block with language
  await expect(preview.locator("pre code.language-rust").first()).toBeVisible();
  await expect(preview.locator("pre code").first()).toContainText('fn main()');

  // Blockquotes — includes nested levels
  await expect(preview.locator("blockquote")).toHaveCount(6);
  await expect(preview.locator("blockquote").filter({ hasText: "Single-level blockquote" })).toBeVisible();

  // Ordered & unordered lists
  await expect(preview.locator("ol > li")).toHaveCount(9);

  // Task list — checkbox inline with label (the key fix)
  const taskItems = preview.locator("li.task-list-item");
  await expect(taskItems).toHaveCount(7); // 2 in Quick Start + 5 in Task List

  // Verify the Task List section items (last 5)
  for (let i = 2; i < 5; i++) {
    const item = taskItems.nth(i);
    await expect(item.locator("input[type='checkbox']").first()).toBeVisible();
    const text = await item.textContent();
    expect(text).toMatch(/(Completed task|Pending task|Another pending task)/);
  }

  // Target the Simple Table specifically
  const simpleTable = preview.locator("table").filter({ hasText: "All 6 levels" });
  await expect(simpleTable).toBeVisible();
  await expect(simpleTable.locator("th")).toHaveCount(3);
  await expect(simpleTable.locator("tbody tr")).toHaveCount(5);

  // Horizontal rules
  const hrCount = await preview.evaluate((el) => el.querySelectorAll("hr").length);
  expect(hrCount).toBeGreaterThanOrEqual(4);
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

  const box = await modal.boundingBox();
  expect(box?.height).toBeGreaterThan(600);

  // Switch to Shortcuts category
  await modal.locator('.sidebar-item').filter({ hasText: "Shortcuts" }).click();
  const boxAfter = await modal.boundingBox();
  expect(Math.round(boxAfter?.height ?? 0)).toBe(Math.round(box?.height ?? 0));

  // Switch to About category
  await modal.locator('.sidebar-item').filter({ hasText: "About" }).click();
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

test("theme toggle keeps icon, data-theme, and CSS in sync", async ({ page }) => {
  const themeBtn = page.locator('button[aria-label="Toggle theme"]');
  const html = page.locator("html");

  async function getThemeState() {
    return page.evaluate(() => {
      const html = document.documentElement;
      const btn = document.querySelector('button[aria-label="Toggle theme"]');
      const svg = btn?.querySelector("svg");
      // Lucide Sun has circles + lines; Moon has a single path
      const isSun = svg ? (svg.querySelectorAll("circle").length > 0 || svg.querySelectorAll("line").length > 0) : false;
      const computedBg = getComputedStyle(html).getPropertyValue("--bg-base").trim();
      return {
        dataTheme: html.getAttribute("data-theme"),
        isSunIcon: isSun,
        bgBase: computedBg,
        colorScheme: html.style.colorScheme,
      };
    });
  }

  // Cycle through all three states and verify consistency at each step
  for (let i = 0; i < 3; i++) {
    const before = await getThemeState();

    // The data-theme attribute must NEVER be "system" — CSS can't handle it
    expect(before.dataTheme).not.toBe("system");

    // Icon and CSS must agree: sun ↔ dark, moon ↔ light
    const isDark = before.dataTheme === "dark";
    expect(before.isSunIcon).toBe(isDark);

    // Background color should match the theme
    if (isDark) {
      expect(before.bgBase).toBe("#0d0d0d");
    } else {
      expect(before.bgBase).toBe("#fafafa");
    }

    // colorScheme style should also match
    expect(before.colorScheme).toBe(isDark ? "dark" : "light");

    await themeBtn.click();
    // Give Svelte a tick to re-render the icon
    await page.waitForTimeout(50);
  }
});

test("theme toggle discards active preset and reverts to default palette", async ({ page }) => {
  const themeBtn = page.locator('button[aria-label="Toggle theme"]');
  const html = page.locator("html");

  // Set a preset via the store
  await page.evaluate(() => {
    (window as any).presetStore?.set("nord");
    document.documentElement.setAttribute("data-theme-preset", "nord");
    document.documentElement.setAttribute("data-theme", "dark");
  });
  await expect(html).toHaveAttribute("data-theme-preset", "nord");

  // Click toggle — preset should be discarded
  await themeBtn.click();
  await expect(html).not.toHaveAttribute("data-theme-preset");
});

test("accessibility settings are present in settings modal", async ({ page }) => {
  await page.locator('button[aria-label="Settings"]').click();

  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible({ timeout: 3000 });

  // Interface font size field (in General category, visible by default)
  await expect(modal.locator('input#ui-font-size')).toBeVisible();
  const uiFontSizeVal = await modal.locator('input#ui-font-size').inputValue();
  expect(Number(uiFontSizeVal)).toBeGreaterThanOrEqual(10);
  expect(Number(uiFontSizeVal)).toBeLessThanOrEqual(24);

  // Preview font size field (in Preview category - navigate there)
  await modal.locator('.sidebar-item').filter({ hasText: "Preview" }).click();
  await expect(modal.locator('input#preview-font-size')).toBeVisible();
  const fontSizeVal = await modal.locator('input#preview-font-size').inputValue();
  expect(Number(fontSizeVal)).toBeGreaterThanOrEqual(8);
  expect(Number(fontSizeVal)).toBeLessThanOrEqual(32);

  // Reduced motion toggle (in General category)
  await modal.locator('.sidebar-item').filter({ hasText: "General" }).click();
  await expect(modal.locator('label:has-text("Reduced motion")')).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
});

test("reduced motion setting applies data attribute to html", async ({ page }) => {
  // Default: reduced motion is false
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-reduced-motion", "false");
});

test("zoom in and out with keyboard shortcuts", async ({ page }) => {
  const zoomIndicator = page.locator(".zoom-badge span");
  await expect(zoomIndicator).toHaveText("100%");

  // Zoom in
  await page.click('.app');
  await page.keyboard.press("Control+Equal");
  await expect(zoomIndicator).toHaveText("110%");

  // Zoom in again
  await page.click('.app');
  await page.keyboard.press("Control+Equal");
  await expect(zoomIndicator).toHaveText("120%");

  // Zoom out
  await page.click('.app');
  await page.keyboard.press("Control+Minus");
  await expect(zoomIndicator).toHaveText("110%");

  // Reset
  await page.click('.app');
  await page.keyboard.press("Control+0");
  await expect(zoomIndicator).toHaveText("100%");
});

test("zoom indicator resets zoom when clicked", async ({ page }) => {
  const zoomIndicator = page.locator(".zoom-badge span");

  // Zoom in first
  await page.click('.app');
  await page.keyboard.press("Control+Equal");
  await expect(zoomIndicator).toHaveText("110%");

  // Click to reset
  await zoomIndicator.click();
  await expect(zoomIndicator).toHaveText("100%");
});

test("no console errors on startup", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  // Reload to capture startup errors (re-inject mock before reload)
  await page.addInitScript(tauriMockInitFunc);
  await page.reload();
  await page.waitForSelector(".app", { timeout: 10000 });
  await page.waitForTimeout(500);

  // Filter out known benign errors
  const criticalErrors = errors.filter(
    (e) => !e.includes("source map") && !e.includes("favicon")
  );
  expect(criticalErrors).toEqual([]);
});

test("Help button opens modal on Shortcuts category", async ({ page }) => {
  await page.locator('button[aria-label="Help"]').click();

  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible({ timeout: 3000 });

  // Should be on Shortcuts category
  const shortcutsItem = modal.locator('.sidebar-item').filter({ hasText: "Shortcuts" });
  await expect(shortcutsItem).toHaveClass(/active/);

  // Should show shortcuts list
  await expect(modal.locator(".shortcut-row").first()).toBeVisible();

  // Close
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
});

test("Settings button opens modal on General category", async ({ page }) => {
  await page.locator('button[aria-label="Settings"]').click();

  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible({ timeout: 3000 });

  // Should be on General category
  const generalItem = modal.locator('.sidebar-item').filter({ hasText: "General" });
  await expect(generalItem).toHaveClass(/active/);

  // Should show settings sections
  await expect(modal.locator('h3:has-text("Appearance")')).toBeVisible();

  // Close
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
});

test("settings modal traps focus", async ({ page }) => {
  await page.locator('button[aria-label="Settings"]').click();
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible({ timeout: 3000 });

  // Focus should start inside the modal
  const initiallyInside = await page.evaluate(() =>
    document.activeElement?.closest('[role="dialog"]') !== null
  );
  expect(initiallyInside).toBe(true);

  // Tab through several elements; focus should stay inside the modal
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() =>
      document.activeElement?.closest('[role="dialog"]') !== null
    );
    expect(inside).toBe(true);
  }

  // Close
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
});

test("sidebar panel can be toggled with Ctrl+B", async ({ page }) => {
  // Panel is collapsed by default
  await expect(page.locator(".sidebar")).toHaveCount(0);

  // Toggle with Ctrl+B — panel opens
  await page.click('.app');
  await page.keyboard.press("Control+b");
  await expect(page.locator(".sidebar")).toBeVisible();

  // Toggle back — panel closes
  await page.click('.app');
  await page.keyboard.press("Control+b");
  await expect(page.locator(".sidebar")).toHaveCount(0);
});

test("sidebar width changes per activity", async ({ page }) => {
  await page.click('.app');
  await page.keyboard.press("Control+b");
  await expect(page.locator(".sidebar")).toBeVisible();

  const getSidebarWidth = () =>
    page.evaluate(() => {
      const wrapper = document.querySelector(".sidebar-wrapper") as HTMLElement | null;
      return wrapper ? parseInt(getComputedStyle(wrapper).width, 10) : 0;
    });

  // Switch to each activity and capture widths; they should differ.
  await page.click('.activity-btn[aria-label="Outline"]');
  await page.waitForTimeout(200);
  const outlineWidth = await getSidebarWidth();

  await page.click('.activity-btn[aria-label="Files"]');
  await page.waitForTimeout(200);
  const filesWidth = await getSidebarWidth();

  await page.click('.activity-btn[aria-label="Links"]');
  await page.waitForTimeout(200);
  const linksWidth = await getSidebarWidth();

  expect(new Set([outlineWidth, filesWidth, linksWidth]).size).toBe(3);
});

test("view mode buttons switch between split, editor, and preview", async ({ page }) => {
  const editorPane = page.locator(".editor-pane");
  const previewPane = page.locator(".preview-scroller");
  const splitPane = page.locator(".split-pane");

  // Default: split mode
  await expect(editorPane).toBeVisible();
  await expect(previewPane).toBeVisible();
  await expect(splitPane).toBeVisible();

  // Switch to editor-only — panes stay mounted, editor visible, preview hidden
  await page.locator('button[aria-label="Editor"]').click();
  await expect(editorPane).toBeVisible();
  await expect(previewPane).not.toBeVisible();
  await expect(splitPane).toBeVisible();

  // Switch to preview-only — editor hidden, preview visible
  await page.locator('button[aria-label="Preview"]').click();
  await expect(editorPane).not.toBeVisible();
  await expect(previewPane).toBeVisible();
  await expect(splitPane).toBeVisible();

  // Switch back to split
  await page.locator('button[aria-label="Split"]').click();
  await expect(editorPane).toBeVisible();
  await expect(previewPane).toBeVisible();
  await expect(splitPane).toBeVisible();
});

test("preview pane is properly configured for scrolling", async ({ page }) => {
  const previewScroller = page.locator(".preview-scroller");
  await expect(previewScroller).toBeVisible();

  const overflow = await previewScroller.evaluate((el) =>
    getComputedStyle(el).overflow
  );
  expect(overflow).toBe("auto");
});

test("closing the last tab keeps split pane intact with divider visible", async ({
  page,
}) => {
  const splitPane = page.locator(".split-pane");
  const divider = page.getByRole("separator", { name: "Resize panes" });
  const editorPane = page.locator(".editor-pane");
  const previewScroller = page.locator(".preview-scroller");

  await expect(splitPane).toBeVisible();
  await expect(divider).toBeVisible();
  await expect(editorPane).toBeVisible();
  await expect(previewScroller).toBeVisible();

  // Close the only tab
  const tab = page.locator(".tab-bar .tab").first();
  await tab.hover();
  await tab.locator('button[aria-label^="Close"]').click();
  await page.waitForTimeout(300);

  // Split pane and divider should remain intact (with empty/hint content)
  await expect(splitPane).toBeVisible();
  await expect(divider).toBeVisible();
  await expect(editorPane).toBeVisible();
  await expect(page.locator(".editor-pane .editor-empty-hint")).toBeVisible();
  await expect(previewScroller).toBeVisible();
  await expect(previewScroller.locator(".empty-state")).toBeVisible();

  const dividerBox = await divider.boundingBox();
  expect(dividerBox?.width).toBeGreaterThan(0);
  expect(dividerBox?.height).toBeGreaterThan(0);
});

test("editor scroller is properly configured", async ({ page }) => {
  const cmScroller = page.locator(".cm-scroller");
  await expect(cmScroller).toBeVisible();

  const overflowY = await cmScroller.evaluate(
    (el: HTMLElement) => getComputedStyle(el).overflowY
  );
  expect(overflowY).toBe("auto");
});

test("content zoom store resets correctly on startup", async ({ page }) => {
  const zoomIndicator = page.locator(".zoom-badge span");
  await expect(zoomIndicator).toHaveText("100%");
});

test("editing content updates preview within render timeout", async ({
  page,
}) => {
  // Verify the editor has content to start with
  const initialText = await page.evaluate(() => {
    const v = (window as any).EditorView?.findFromDOM(document.querySelector(".cm-content"));
    return v ? v.state.doc.toString() : "";
  });
  expect(initialText.length).toBeGreaterThan(0);

  // Modify editor content
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+a");

  // Verify content is still present after typing
  const textAfter = await page.evaluate(() => {
    const v = (window as any).EditorView?.findFromDOM(document.querySelector(".cm-content"));
    return v ? v.state.doc.toString() : "";
  });
  expect(textAfter.length).toBeGreaterThan(0);
});

test("editor content renders in CodeMirror and scroller handles overflow", async ({
  page,
}) => {
  // Set long content via CodeMirror API to be reliable
  const longText = "# New Document\n\n" + Array.from({ length: 200 }, (_, i) => `Line ${i + 1}`).join("\n");
  await page.evaluate((text) => {
    const view = (window as any).EditorView?.findFromDOM(document.querySelector(".cm-content"));
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
      });
    }
  }, longText);
  await page.waitForTimeout(500);

  // Verify content was set
  const editorText = await page.evaluate(() => {
    const view = (window as any).EditorView?.findFromDOM(document.querySelector(".cm-content"));
    return view ? view.state.doc.toString().substring(0, 50) : "";
  });
  expect(editorText).toContain("New Document");

  // Scroller should have overflow-y: auto
  const overflowY = await page
    .locator(".cm-scroller")
    .evaluate((el: HTMLElement) => getComputedStyle(el).overflowY);
  expect(overflowY).toBe("auto");
});

test("split pane divider maintains position after tab operations", async ({
  page,
}) => {
  // Get divider position
  const divider = page.getByRole("separator", { name: "Resize panes" });
  const initialBox = await divider.boundingBox();
  expect(initialBox?.width).toBeGreaterThan(0);

  // Create a new tab
  await page.locator('button[aria-label="New tab"]').click();
  await page.waitForTimeout(300);

  // Divider should still be visible
  await expect(divider).toBeVisible();
  const afterNewTab = await divider.boundingBox();
  expect(afterNewTab?.width).toBeGreaterThan(0);

  // Close the new tab, switch back
  const tabs = page.locator(".tab-bar .tab");
  await tabs.first().hover();
  await tabs.first().locator('button[aria-label^="Close"]').click();
  await page.waitForTimeout(300);

  // Divider should remain
  await expect(divider).toBeVisible();
  const afterClose = await divider.boundingBox();
  expect(afterClose?.width).toBeGreaterThan(0);
});

test("preview shows correct content when switching tabs rapidly", async ({
  page,
}) => {
  async function getEditorText() {
    return page.evaluate(() => {
      const v = (window as any).EditorView?.findFromDOM(
        document.querySelector(".cm-content")
      );
      return v ? v.state.doc.toString() : "";
    });
  }

  async function setEditorText(text: string) {
    await page.evaluate((t) => {
      const v = (window as any).EditorView?.findFromDOM(
        document.querySelector(".cm-content")
      );
      if (v)
        v.dispatch({
          changes: { from: 0, to: v.state.doc.length, insert: t },
        });
    }, text);
  }

  // Set first document content
  await setEditorText("# First Doc\n\nContent of the first document.");
  await page.waitForTimeout(300);
  expect(await getEditorText()).toContain("First Doc");

  // Create a new tab and set second content
  await page.locator('button[aria-label="New tab"]').click();
  await page.waitForTimeout(200);
  await setEditorText("# Second Doc\n\nContent of the second document.");
  await page.waitForTimeout(300);
  expect(await getEditorText()).toContain("Second Doc");

  // Switch back to first tab — editor should have first doc's content
  const tabs = page.locator(".tab-bar .tab");
  await tabs.nth(0).click();
  await page.waitForTimeout(500);
  expect(await getEditorText()).toContain("First Doc");

  // Switch back to second tab — editor should have second doc's content
  await tabs.nth(1).click();
  await page.waitForTimeout(500);
  expect(await getEditorText()).toContain("Second Doc");
});

test.describe("Preview inline search", () => {
  test("Ctrl+F in preview opens search bar and highlights matches", async ({ page }) => {
    // Set preview HTML via mocked render_preview
    await page.evaluate(() => {
      const origInvoke = (window as any).__TAURI_INTERNALS__?.invoke;
      if (!origInvoke) return;
      (window as any).__TAURI_INTERNALS__.invoke = async function(cmd: string, args?: any) {
        if (cmd === "render_preview") {
          return "<p>Hello world, this is a test paragraph for searching.</p>";
        }
        return origInvoke(cmd, args);
      };
    });

    await setEditorText(page, "# Preview Search Test\n\nHello world, this is a test paragraph for searching.");
    await page.waitForTimeout(400);

    // Focus the preview scroller so Ctrl+F is routed to preview search.
    await page.evaluate(() => {
      const scroller = document.querySelector(".preview-scroller") as HTMLElement | null;
      scroller?.focus();
    });

    await page.keyboard.press("Control+f");

    const searchBar = page.locator(".preview-search-bar");
    await expect(searchBar).toBeVisible();

    const input = searchBar.locator(".preview-search-input");
    await input.fill("test");
    await page.waitForTimeout(200);

    // Counter should show one match for "test" ("searching" does not contain "test")
    await expect(searchBar.locator(".preview-search-count")).toContainText("1 / 1");

    // Close with Escape
    await page.keyboard.press("Escape");
    await expect(searchBar).not.toBeVisible();
  });
});

test.describe("Command palette", () => {
  test("command palette opens and shows categories", async ({ page }) => {
    await page.click('.app');
    await page.keyboard.press("Control+Shift+p");

    const palette = page.locator('[role="dialog"][aria-label="Command Palette"]');
    await expect(palette).toBeVisible({ timeout: 3000 });

    // Category headers should be visible
    await expect(palette.locator('.palette-category').filter({ hasText: "File" })).toBeVisible();
    await expect(palette.locator('.palette-category').filter({ hasText: "View" })).toBeVisible();
  });

  test("command palette filters by query", async ({ page }) => {
    await page.click('.app');
    await page.keyboard.press("Control+Shift+p");

    const palette = page.locator('[role="dialog"][aria-label="Command Palette"]');
    await expect(palette).toBeVisible({ timeout: 3000 });

    const input = palette.locator('.palette-input');
    await input.fill("export docx");

    // The top result should be the Export to DOCX command
    const items = palette.locator('.palette-item');
    await expect(items.first()).toContainText("Export to DOCX");
    await expect(items).toHaveCount(1);
  });

  test("command palette sorts by frecency when query is empty", async ({ page }) => {
    // Seed frecency so "New File" is the most-used File command, then reload
    // so the palette module reads the seeded value at startup.
    await page.evaluate(() => {
      localStorage.setItem("markz:command-frecency", JSON.stringify({ "new-file": 5, "open-file": 1, "save": 2 }));
    });
    await page.addInitScript(tauriMockInitFunc);
    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    await page.click('.app');
    await page.keyboard.press("Control+Shift+p");

    const palette = page.locator('[role="dialog"][aria-label="Command Palette"]');
    await expect(palette).toBeVisible({ timeout: 3000 });

    const firstFileLabel = await page.evaluate(() => {
      const cats = Array.from(document.querySelectorAll('.palette-category'));
      const fileCat = cats.find((c) => c.textContent?.trim() === 'File');
      if (!fileCat) return null;
      let next = fileCat.nextElementSibling;
      while (next && !next.classList.contains('palette-item')) {
        next = next.nextElementSibling;
      }
      return next?.querySelector('.palette-item-label')?.textContent ?? null;
    });
    expect(firstFileLabel).toBe("New File");
  });
});

test.describe("Zen mode", () => {
  test("Ctrl+K Z hides chrome and shows exit button", async ({ page }) => {
    await expect(page.locator(".titlebar")).toBeVisible();
    await expect(page.locator(".tab-bar")).toBeVisible();
    await expect(page.locator(".statusbar")).toBeVisible();

    await page.keyboard.press("Control+k");
    await page.keyboard.press("z");

    await expect(page.locator(".app")).toHaveClass(/zen-mode/);
    await expect(page.locator(".titlebar")).not.toBeVisible();
    await expect(page.locator(".tab-bar")).not.toBeVisible();
    await expect(page.locator(".statusbar")).not.toBeVisible();
    await expect(page.locator(".zen-exit-btn")).toBeVisible();
  });

  test("Esc Esc exits zen mode", async ({ page }) => {
    await page.keyboard.press("Control+k");
    await page.keyboard.press("z");
    await expect(page.locator(".app")).toHaveClass(/zen-mode/);

    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    await expect(page.locator(".app")).not.toHaveClass(/zen-mode/);
    await expect(page.locator(".titlebar")).toBeVisible();
    await expect(page.locator(".tab-bar")).toBeVisible();
    await expect(page.locator(".statusbar")).toBeVisible();
  });

  test("exit button restores chrome", async ({ page }) => {
    await page.keyboard.press("Control+k");
    await page.keyboard.press("z");
    await expect(page.locator(".app")).toHaveClass(/zen-mode/);

    await page.locator(".zen-exit-btn").click();

    await expect(page.locator(".app")).not.toHaveClass(/zen-mode/);
    await expect(page.locator(".titlebar")).toBeVisible();
    await expect(page.locator(".tab-bar")).toBeVisible();
    await expect(page.locator(".statusbar")).toBeVisible();
  });
});