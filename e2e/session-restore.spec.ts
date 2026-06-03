import { test, expect } from "@playwright/test";
import { tauriMockScriptString } from "./tauri-mock";

test.describe("Session restore", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(tauriMockScriptString);
  });

  test("restores previously opened file tabs on reload", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem(
        "markz-session",
        JSON.stringify({
          tabs: [
            { content: "# Doc1", path: "/home/user/doc1.md", title: "doc1.md", isDirty: false },
            { content: "# Doc2", path: "/home/user/doc2.md", title: "doc2.md", isDirty: false },
          ],
          activeTabPath: "/home/user/doc2.md",
        })
      );
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(2, { timeout: 5000 });

    await expect(tabs.nth(0)).toContainText("doc1.md");
    await expect(tabs.nth(1)).toContainText("doc2.md");

    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
  });

  test("restores untitled tabs with their content", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem(
        "markz-session",
        JSON.stringify({
          tabs: [
            { content: "# My Draft\n\nSome unsaved content here.", path: null, title: "Untitled", isDirty: true },
          ],
          activeTabPath: null,
        })
      );
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(1, { timeout: 5000 });
    await expect(tabs.first()).toContainText("Untitled");

    // The dirty dot should be visible since isDirty was true
    await expect(tabs.first().locator(".tab-dot")).toBeVisible({ timeout: 3000 });
  });

  test("falls back to welcome tab when session is empty", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    await page.evaluate(() => {
      localStorage.removeItem("markz-session");
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(1);
    await expect(tabs.first()).toContainText("Untitled");
  });

  test("ignores missing files and restores the rest", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem(
        "markz-session",
        JSON.stringify({
          tabs: [
            { content: "", path: "/good.md", title: "good.md", isDirty: false },
            { content: "", path: "/missing.md", title: "missing.md", isDirty: false },
          ],
          activeTabPath: "/good.md",
        })
      );
      localStorage.setItem("__e2e_reject_paths", JSON.stringify(["/missing.md"]));
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(1, { timeout: 5000 });
    await expect(tabs.first()).toContainText("good.md");
  });

  test("corrupted session data is ignored", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem("markz-session", "not-json{{{");
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(1);
  });

  test("deduplicates duplicate paths in session", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem(
        "markz-session",
        JSON.stringify({
          tabs: [
            { content: "", path: "/same.md", title: "same.md", isDirty: false },
            { content: "", path: "/same.md", title: "same.md", isDirty: false },
            { content: "", path: "/other.md", title: "other.md", isDirty: false },
          ],
          activeTabPath: "/same.md",
        })
      );
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(2, { timeout: 5000 });
    const texts = await tabs.allTextContents();
    const sameCount = texts.filter((t) => t.includes("same.md")).length;
    expect(sameCount).toBe(1);
  });

  test("restores previously opened workspace folder on reload", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem(
        "markz-session",
        JSON.stringify({
          tabs: [
            { content: "# Doc1", path: "/test-workspace/doc1.md", title: "doc1.md", isDirty: false },
          ],
          activeTabPath: "/test-workspace/doc1.md",
          workspacePath: "/test-workspace",
        })
      );
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
      localStorage.setItem("__e2e_workspace_files", JSON.stringify([
        { path: "/test-workspace/doc1.md", rel_path: "doc1.md", name: "doc1.md", is_dir: false, children: [] },
        { path: "/test-workspace/docs", rel_path: "docs", name: "docs", is_dir: true, children: [
          { path: "/test-workspace/docs/readme.md", rel_path: "docs/readme.md", name: "readme.md", is_dir: false, children: [] },
        ]},
      ]));
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    // Open Files panel
    await page.click('.activity-btn[aria-label="Files"]');

    // Workspace tree should be visible
    await expect(page.locator(".tree-file").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".tree-file").first()).toContainText("doc1.md");
    await expect(page.locator(".tree-dir").first()).toContainText("docs");
  });

  test("restores correct content for each tab", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });

    // Set up file content overrides per path
    await page.evaluate(() => {
      localStorage.setItem("__e2e_file_contents", JSON.stringify({
        "/project/doc-a.md": "# Document A\n\nContent of doc A.",
        "/project/doc-b.md": "# Document B\n\nContent of doc B.",
      }));
      localStorage.setItem(
        "markz-session",
        JSON.stringify({
          tabs: [
            { content: "", path: "/project/doc-a.md", title: "doc-a.md", isDirty: false, pinned: false },
            { content: "", path: "/project/doc-b.md", title: "doc-b.md", isDirty: false, pinned: false },
            { content: "# Untitled Draft\n\nSome notes.", path: null, title: "Notes", isDirty: true, pinned: false },
          ],
          activeTabPath: "/project/doc-b.md",
        })
      );
    });

    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });

    // All 3 tabs should be restored
    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(3, { timeout: 5000 });
    await expect(tabs.nth(0)).toContainText("doc-a.md");
    await expect(tabs.nth(1)).toContainText("doc-b.md");
    await expect(tabs.nth(2)).toContainText("Notes");

    // Active should be doc-b (based on activeTabPath)
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");

    // Verify the editor content via CodeMirror
    const getEditorText = () =>
      page.evaluate(() => {
        const view = (window as any).EditorView?.findFromDOM(document.querySelector(".cm-content"));
        return view ? view.state.doc.toString() : "";
      });

    // Active tab (doc-b) should have doc-b content
    const contentB = await getEditorText();
    expect(contentB).toContain("Document B");

    // Switch to doc-a and verify its content
    await tabs.nth(0).click();
    await page.waitForTimeout(500);
    const contentA = await getEditorText();
    expect(contentA).toContain("Document A");

    // Switch to untitled Notes tab and verify its content
    await tabs.nth(2).click();
    await page.waitForTimeout(500);
    const contentNotes = await getEditorText();
    expect(contentNotes).toContain("Untitled Draft");
  });

  test("preview renders the restored file content after session reload — not the welcome template", async ({ page }) => {
    // This reproduces the bug where after restart, the preview shows the default
    // welcome template preview instead of the actual restored file content.
    await page.goto("/");
    await page.waitForSelector(".app", { timeout: 10000 });
    // Set up file content with a distinct H1 that differs from "Welcome to MarkZ"
    await page.evaluate(() => {
      localStorage.setItem("__e2e_file_contents", JSON.stringify({
        "/work/notes.md": "# My Restored File\n\nThis content should show after reload.",
      }));
      localStorage.setItem(
        "markz-session",
        JSON.stringify({
          tabs: [
            { content: "", path: "/work/notes.md", title: "notes.md", isDirty: false, pinned: false },
          ],
          activeTabPath: "/work/notes.md",
        })
      );
    });
    // Inject a content-aware render_preview mock that returns different HTML
    // depending on the markdown so we can verify the preview pane receives
    // the restored file content, not the welcome template.
    await page.addInitScript(`
      (function() {
        const origInvoke = window.__TAURI_INTERNALS__?.invoke;
        if (!origInvoke) return;
        window.__TAURI_INTERNALS__.invoke = async function(cmd, args) {
          if (cmd === "render_preview") {
            const md = args?.markdown || "";
            if (md.indexOf("Welcome to MarkZ") !== -1) {
              return "<h1>Welcome to MarkZ</h1><p>Default preview</p>";
            }
            if (md.indexOf("My Restored File") !== -1) {
              return "<h1>My Restored File</h1><p>Restored preview</p>";
            }
            return "<p>Preview: " + (md.slice(0, 30) || "empty") + "</p>";
          }
          return origInvoke(cmd, args);
        };
      })();
    `);
    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });
    await page.waitForTimeout(800);
    // Tab should be restored
    const tabs = page.locator(".tab-bar .tab");
    await expect(tabs).toHaveCount(1, { timeout: 5000 });
    await expect(tabs.first()).toContainText("notes.md");
    // Editor should show the restored file content (not welcome template)
    const editorText = await page.evaluate(() => {
      const v = (window as any).EditorView?.findFromDOM(document.querySelector(".cm-content"));
      return v ? v.state.doc.toString() : "";
    });
    expect(editorText).toContain("My Restored File");
    expect(editorText).not.toContain("Welcome to MarkZ");
    // Preview should also show the restored file content, not welcome template
    const previewHTML = await page.locator(".preview-content").innerHTML();
    expect(previewHTML).toContain("My Restored File");
    expect(previewHTML).not.toContain("Welcome to MarkZ");
  });
});
