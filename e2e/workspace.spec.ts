import { test, expect, type Page } from "@playwright/test";
import { tauriMockInitFunc } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockInitFunc);
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

test.describe("Workspace file tree", () => {
  test("shows open folder prompt initially", async ({ page }) => {
    await page.click('.activity-btn[aria-label="Files"]');
    await expect(page.locator(".file-tree-scroller .empty-state")).toBeVisible();
    await expect(page.locator(".file-tree-scroller .empty-state h3")).toContainText("No folder open");
  });

  test("opens folder and displays file tree", async ({ page }) => {
    // Directly set the workspace state via page.evaluate
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    
    // Open Files tab
    await page.click('.activity-btn[aria-label="Files"]');
    
    // Click Open Folder via EmptyState action button
    await page.locator(".file-tree-scroller .btn-secondary").click();
    
    // Wait for tree to appear
    await page.waitForSelector(".tree-file", { timeout: 5000 });
    
    // Check tree nodes are rendered
    await expect(page.locator(".tree-dir").first()).toBeVisible();
    await expect(page.locator(".tree-file").first()).toBeVisible();
  });

  test("expands directory on click", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    await page.click('.activity-btn[aria-label="Files"]');
    await page.locator(".file-tree-scroller .btn-secondary").click();
    await page.waitForSelector(".tree-dir", { timeout: 5000 });

    const dirBtn = page.locator(".tree-dir").first();
    await dirBtn.click();

    // Chevron should be rotated
    await expect(dirBtn.locator(".tree-chevron.expanded")).toBeVisible();
    // Child file should appear
    await expect(page.locator(".tree-file").first()).toBeVisible();
  });

  test("expands nested directories on click", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "__e2e_workspace_files",
        JSON.stringify([
          {
            name: "docs",
            path: "/test-workspace/docs",
            rel_path: "docs",
            is_dir: true,
            children: [
              {
                name: "sub",
                path: "/test-workspace/docs/sub",
                rel_path: "docs/sub",
                is_dir: true,
                children: [
                  { name: "inner.md", path: "/test-workspace/docs/sub/inner.md", rel_path: "docs/sub/inner.md", is_dir: false, children: [] },
                ],
              },
            ],
          },
        ])
      );
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    await page.click('.activity-btn[aria-label="Files"]');
    await page.locator(".file-tree-scroller .btn-secondary").click();
    await page.waitForSelector(".tree-dir", { timeout: 5000 });

    // Expand top-level docs directory.
    const docsBtn = page.locator(".tree-dir", { hasText: "docs" });
    await docsBtn.click();
    await expect(docsBtn.locator(".tree-chevron.expanded")).toBeVisible();
    await expect(page.locator(".tree-dir", { hasText: "sub" })).toBeVisible();

    // Expand nested sub directory.
    const subBtn = page.locator(".tree-dir", { hasText: "sub" });
    await subBtn.click();
    await expect(subBtn.locator(".tree-chevron.expanded")).toBeVisible();
    await expect(page.locator(".tree-file", { hasText: "inner.md" })).toBeVisible();
  });

  test("opens file from tree", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    await page.click('.activity-btn[aria-label="Files"]');
    await page.locator(".file-tree-scroller .btn-secondary").click();
    await page.waitForSelector(".tree-file", { timeout: 5000 });

    await page.locator(".tree-file").first().click();
    // Should open in a new tab
    await expect(page.locator('.tab:has-text("notes.md")')).toBeVisible();
  });

  test("clicking an already-open file from tree focuses its tab", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    await page.click('.activity-btn[aria-label="Files"]');
    await page.locator(".file-tree-scroller .btn-secondary").click();
    await page.waitForSelector(".tree-file", { timeout: 5000 });

    // Open the file once from the tree.
    await page.locator(".tree-file", { hasText: "notes.md" }).click();
    await expect(page.locator('.tab:has-text("notes.md")')).toHaveCount(1);
    const firstTab = page.locator('.tab:has-text("notes.md")');
    await firstTab.click();

    // Open an unrelated file so the notes.md tab is no longer active.
    await page.evaluate(() => localStorage.setItem("__e2e_open_file_result", "/test-workspace/other.md"));
    await page.keyboard.press("Control+o");
    await page.waitForSelector('.tab:has-text("other.md")', { timeout: 5000 });
    await expect(page.locator('.tab.active')).toContainText("other.md");

    // Clicking notes.md in the tree again should focus the existing tab, not duplicate it.
    await page.locator(".tree-file", { hasText: "notes.md" }).click();
    await expect(page.locator('.tab:has-text("notes.md")')).toHaveCount(1);
    await expect(page.locator('.tab.active')).toContainText("notes.md");
  });

  test("opening a folder keeps unrelated existing tabs", async ({ page }) => {
    // Open an unrelated file so we have a stale tab.
    await page.evaluate(() => localStorage.setItem("__e2e_open_file_result", "/some/other.md"));
    await page.keyboard.press("Control+o");
    await page.waitForSelector('.tab:has-text("other.md")', { timeout: 5000 });
    await expect(page.locator('.tab:has-text("other.md")')).toBeVisible();

    // Now open a folder.
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    await page.click('.activity-btn[aria-label="Files"]');
    await page.waitForSelector('.file-tree-header, .file-tree-scroller', { timeout: 5000 });
    // The Open Folder button may be in the empty state or the tree header,
    // depending on whether opening the previous file synced a workspace.
    const openFolderBtn = page.locator('button[aria-label="Open folder"]').first();
    await expect(openFolderBtn).toBeVisible();
    await openFolderBtn.click();
    await page.waitForSelector(".tree-file", { timeout: 5000 });

    // The unrelated tab should remain open, and a new untitled tab should be
    // created for the folder context.
    await expect(page.locator('.tab:has-text("other.md")')).toBeVisible();
    await expect(page.locator('.tab:has-text("Untitled")')).toHaveCount(2);
    await expect(page.locator('.tab.active')).toContainText("Untitled");
  });

  test("refresh preserves nested expanded directories", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "__e2e_workspace_files",
        JSON.stringify([
          {
            name: "docs",
            path: "/test-workspace/docs",
            rel_path: "docs",
            is_dir: true,
            children: [
              {
                name: "sub",
                path: "/test-workspace/docs/sub",
                rel_path: "docs/sub",
                is_dir: true,
                children: [
                  { name: "inner.md", path: "/test-workspace/docs/sub/inner.md", rel_path: "docs/sub/inner.md", is_dir: false, children: [] },
                ],
              },
            ],
          },
        ])
      );
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    await page.click('.activity-btn[aria-label="Files"]');
    await page.locator(".file-tree-scroller .btn-secondary").click();
    await page.waitForSelector(".tree-dir", { timeout: 5000 });

    // Expand docs and sub.
    await page.locator(".tree-dir", { hasText: "docs" }).click();
    await page.locator(".tree-dir", { hasText: "sub" }).click();
    await expect(page.locator(".tree-file", { hasText: "inner.md" })).toBeVisible();

    // Trigger a workspace-changed refresh.
    await page.evaluate(() => (window as any).__markz_emit_event("markz:workspace-changed", null));
    await page.waitForTimeout(600);

    // The nested directory should still be expanded after refresh.
    await expect(page.locator(".tree-dir", { hasText: "sub" }).locator(".tree-chevron.expanded")).toBeVisible();
    await expect(page.locator(".tree-file", { hasText: "inner.md" })).toBeVisible();
  });

  test("search finds matches", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    await page.click('.activity-btn[aria-label="Files"]');
    await page.locator(".file-tree-scroller .btn-secondary").click();
    await page.waitForSelector(".tree-file", { timeout: 5000 });

    const searchInput = page.locator('.search-box input');
    await searchInput.fill("hello");
    await page.waitForTimeout(400); // wait for debounce

    await expect(page.locator(".search-results")).toBeVisible();
    await expect(page.locator(".search-result-btn").first()).toBeVisible();
  });

  test("opens search result file", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    await page.click('.activity-btn[aria-label="Files"]');
    await page.locator(".file-tree-scroller .btn-secondary").click();
    await page.waitForSelector(".tree-file", { timeout: 5000 });

    await page.locator('.search-box input').fill("hello");
    await page.waitForTimeout(400);

    await page.locator(".search-result-btn").first().click();
    await expect(page.locator('.tab:has-text("notes.md")')).toBeVisible();
  });
});

// Opens a workspace folder via the Files panel's empty-state action.
async function openFolderInTree(page: Page, root: string) {
  await page.evaluate((r) => localStorage.setItem("__e2e_open_folder_result", r), root);
  await page.click('.activity-btn[aria-label="Files"]');
  await page.locator(".file-tree-scroller .btn-secondary").click();
  await page.waitForSelector(".tree-file", { timeout: 5000 });
}

test.describe("Workspace tree follows active tab", () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });
  });

  test("new untitled tab keeps empty tree", async ({ page }) => {
    await page.click('.activity-btn[aria-label="Files"]');
    await expect(page.locator(".file-tree-scroller .empty-state")).toBeVisible();
    await expect(page.locator(".file-tree-scroller .empty-state h3")).toContainText("No folder open");

    await page.keyboard.press("Control+t");
    await expect(page.locator(".file-tree-scroller .empty-state")).toBeVisible();
    await expect(page.locator(".file-tree-scroller .empty-state h3")).toContainText("No folder open");
  });

  test("saving untitled tab updates tree to saved file's parent directory", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_save_file_result", "/save-test/project.md");
    });
    await page.click('.activity-btn[aria-label="Files"]');
    await expect(page.locator(".file-tree-scroller .empty-state")).toBeVisible();

    await page.keyboard.press("Control+t");
    await page.keyboard.press("Control+s");
    await page.waitForSelector(".file-tree-breadcrumbs", { timeout: 5000 });

    await expect(page.locator(".file-tree-breadcrumbs")).toContainText("save-test");
    await expect(page.locator(".tree-file").first()).toBeVisible();
  });

  test("opening file does not force a folder open when none is open", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_file_result", "/projects/markz/notes.md");
    });
    await page.keyboard.press("Control+o");
    await page.waitForSelector('.tab:has-text("notes.md")', { timeout: 5000 });

    await page.click('.activity-btn[aria-label="Files"]');
    // No workspace should be loaded for a standalone file open.
    await expect(page.locator(".file-tree-scroller .empty-state h3")).toContainText("No folder open");
  });

  test("switching tabs keeps the existing workspace tree", async ({ page }) => {
    // Open a workspace first so the sidebar is populated.
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    await page.click('.activity-btn[aria-label="Files"]');
    await page.locator(".file-tree-scroller .btn-secondary").click();
    await page.waitForSelector(".tree-file", { timeout: 5000 });

    // Open files outside the workspace.
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_file_result", "/folder-a/file-a.md");
    });
    await page.keyboard.press("Control+o");
    await page.waitForSelector('.tab:has-text("file-a.md")', { timeout: 5000 });

    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_file_result", "/folder-b/file-b.md");
    });
    await page.keyboard.press("Control+o");
    await page.waitForSelector('.tab:has-text("file-b.md")', { timeout: 5000 });

    const breadcrumbs = page.locator(".file-tree-breadcrumbs");
    await expect(breadcrumbs).toContainText("test-workspace");

    // Switching between file tabs should not re-root the existing workspace.
    await page.locator('.tab:has-text("file-a.md")').click();
    await expect(breadcrumbs).toContainText("test-workspace");

    await page.locator('.tab:has-text("file-b.md")').click();
    await expect(breadcrumbs).toContainText("test-workspace");
  });

  test("closing all file tabs clears the tree", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_file_result", "/x/f.md");
    });
    await page.keyboard.press("Control+o");
    await page.waitForSelector('.tab:has-text("f.md")', { timeout: 5000 });

    // Opening a single file does not open a workspace; closing the tab keeps
    // the empty state as there is no folder to clear.
    await page.click('.activity-btn[aria-label="Files"]');
    await expect(page.locator(".file-tree-scroller .empty-state h3")).toContainText("No folder open");

    await page.locator('.tab:has-text("f.md") .tab-close').click();

    await expect(page.locator(".file-tree-scroller .empty-state h3")).toContainText("No folder open");
  });

  test("opening folder creates an untitled tab when no file in the folder is open", async ({ page }) => {
    // Start with an unrelated file open so the active tab is outside the folder.
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_file_result", "/other-project/file.md");
    });
    await page.keyboard.press("Control+o");
    await page.waitForSelector('.tab:has-text("file.md")', { timeout: 5000 });
    await expect(page.locator('.tab.active')).toContainText("file.md");

    // Open a different folder via the title bar.
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    await page.locator('[aria-label="Open folder"]').click();

    // The active tab should now reflect the new folder context, not the old file.
    await expect(page.locator('.tab.active')).toContainText("Untitled");

    // Open the Files panel to inspect the new workspace tree.
    await page.click('.activity-btn[aria-label="Files"]');
    await page.waitForSelector(".tree-file", { timeout: 5000 });
    await expect(page.locator(".file-tree-breadcrumbs")).toContainText("test-workspace");
    // The old file tab may remain, but it must no longer be active.
    await expect(page.locator('.tab.active')).not.toContainText("file.md");
  });
});

test.describe("File tree navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });
  });

  test("breadcrumb shows root segments and an open-folder button", async ({ page }) => {
    await openFolderInTree(page, "/home/user/docs");

    await expect(page.locator(".file-tree-breadcrumbs")).toBeVisible();
    await expect(page.locator(".tree-crumb.active")).toContainText("docs");
    await expect(page.locator('.tree-action-btn[aria-label="Open folder"]')).toBeVisible();
  });

  test("clicking an ancestor crumb re-roots the tree", async ({ page }) => {
    await openFolderInTree(page, "/home/user/docs");

    await page.locator('.tree-crumb[data-path="/home/user"]').click();

    // Re-rooting to /home/user makes "user" the active (last) crumb.
    await expect(page.locator(".tree-crumb.active")).toContainText("user", { timeout: 5000 });
  });

  test("tree shows non-markdown files", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_workspace_files", JSON.stringify([
        { name: "readme.txt", path: "/ws/readme.txt", rel_path: "readme.txt", is_dir: false, children: [] },
        { name: "notes.md", path: "/ws/notes.md", rel_path: "notes.md", is_dir: false, children: [] },
      ]));
      localStorage.setItem("__e2e_open_folder_result", "/ws");
    });
    await page.click('.activity-btn[aria-label="Files"]');
    await page.locator(".file-tree-scroller .btn-secondary").click();
    await page.waitForSelector(".tree-file", { timeout: 5000 });

    await expect(page.locator(".tree-file", { hasText: "readme.txt" })).toBeVisible();
  });
});


test.describe("Document navigation history", () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });
  });

  test("Alt+Left and Alt+Right navigate file open history", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    await page.click('.activity-btn[aria-label="Files"]');
    await page.locator(".file-tree-scroller .btn-secondary").click();
    await page.waitForSelector(".tree-file", { timeout: 5000 });

    // Open notes.md
    await page.locator(".tree-file", { hasText: "notes.md" }).click();
    await expect(page.locator('.tab.active')).toContainText("notes.md");

    // Expand docs directory and open readme.md
    await page.locator(".tree-dir", { hasText: "docs" }).click();
    await page.locator(".tree-file", { hasText: "readme.md" }).click();
    await expect(page.locator('.tab.active')).toContainText("readme.md");

    // Alt+Left should go back to notes.md
    await page.keyboard.press("Alt+ArrowLeft");
    await expect(page.locator('.tab.active')).toContainText("notes.md");

    // Alt+Right should go forward to readme.md
    await page.keyboard.press("Alt+ArrowRight");
    await expect(page.locator('.tab.active')).toContainText("readme.md");
  });
});

test.describe("File tree context menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector(".app", { timeout: 10000 });
  });

  test("right-clicking a file shows New File, Rename, Delete", async ({ page }) => {
    await openFolderInTree(page, "/test-workspace");
    await page.locator(".tree-file", { hasText: "notes.md" }).click({ button: "right" });

    await expect(page.locator("[role='menuitem']", { hasText: "New File" })).toBeVisible();
    await expect(page.locator("[role='menuitem']", { hasText: "Rename" })).toBeVisible();
    await expect(page.locator("[role='menuitem']", { hasText: "Delete" })).toBeVisible();
    await expect(page.locator("[role='menuitem']", { hasText: "New Folder" })).toHaveCount(0);
  });

  test("right-clicking a directory shows New File, New Folder, Rename, Delete", async ({ page }) => {
    await openFolderInTree(page, "/test-workspace");
    await page.locator(".tree-dir", { hasText: "docs" }).click({ button: "right" });

    await expect(page.locator("[role='menuitem']", { hasText: "New File" })).toBeVisible();
    await expect(page.locator("[role='menuitem']", { hasText: "New Folder" })).toBeVisible();
    await expect(page.locator("[role='menuitem']", { hasText: "Rename" })).toBeVisible();
    await expect(page.locator("[role='menuitem']", { hasText: "Delete" })).toBeVisible();
  });

  test("New File creates and opens the file", async ({ page }) => {
    await openFolderInTree(page, "/test-workspace");
    await page.locator(".tree-file").first().click({ button: "right" });
    await page.locator("[role='menuitem']", { hasText: "New File" }).click();

    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.locator('#prompt-input').fill("new-doc.md");
    await page.locator('[role="dialog"] .btn-primary').click();

    await expect(page.locator('.tab:has-text("new-doc.md")')).toBeVisible();
    await expect(page.locator(".tree-file", { hasText: "new-doc.md" })).toBeVisible();
  });

  test("New Folder creates the folder", async ({ page }) => {
    await openFolderInTree(page, "/test-workspace");
    await page.locator(".tree-dir", { hasText: "docs" }).click({ button: "right" });
    await page.locator("[role='menuitem']", { hasText: "New Folder" }).click();

    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.locator('#prompt-input').fill("archive");
    await page.locator('[role="dialog"] .btn-primary').click();

    await expect(page.locator(".tree-dir", { hasText: "archive" })).toBeVisible();
  });

  test("Rename renames a file and updates its tab", async ({ page }) => {
    await openFolderInTree(page, "/test-workspace");
    await page.locator(".tree-file", { hasText: "notes.md" }).click();
    await expect(page.locator('.tab:has-text("notes.md")')).toBeVisible();

    await page.locator(".tree-file", { hasText: "notes.md" }).click({ button: "right" });
    await page.locator("[role='menuitem']", { hasText: "Rename" }).click();

    const renameInput = page.locator('.tree-rename input');
    await renameInput.fill("renamed.md");
    await renameInput.blur();

    await expect(page.locator(".tree-file", { hasText: "renamed.md" })).toBeVisible();
    await expect(page.locator('.tab:has-text("renamed.md")')).toBeVisible();
    await expect(page.locator(".tree-file", { hasText: "notes.md" })).toHaveCount(0);
  });

  test("Delete removes a file and closes its tab", async ({ page }) => {
    await openFolderInTree(page, "/test-workspace");
    await page.locator(".tree-file", { hasText: "notes.md" }).click();
    await expect(page.locator('.tab:has-text("notes.md")')).toBeVisible();

    await page.locator(".tree-file", { hasText: "notes.md" }).click({ button: "right" });
    await page.locator("[role='menuitem']", { hasText: "Delete" }).click();

    await expect(page.locator(".tree-file", { hasText: "notes.md" })).toHaveCount(0);
    await expect(page.locator('.tab:has-text("notes.md")')).toHaveCount(0);
  });
});

test.describe("Open folder keyboard shortcut", () => {
  test("Ctrl+Shift+O triggers open folder dialog", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    await page.click('.app');
    await page.keyboard.press("Control+Shift+o");
    await page.waitForTimeout(500);

    await page.click('.activity-btn[aria-label="Files"]');
    await expect(page.locator(".tree-file").first()).toBeVisible();
  });
});

test.describe("TitleBar open folder button", () => {
  test("opens folder when clicked", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_folder_result", "/test-workspace");
    });
    const btn = page.locator('[aria-label="Open folder"]');
    await expect(btn).toBeVisible();
    await btn.click();
    await page.waitForTimeout(500);

    await page.click('.activity-btn[aria-label="Files"]');
    await expect(page.locator(".tree-file").first()).toBeVisible();
  });
});
