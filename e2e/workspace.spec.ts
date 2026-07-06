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

  test("opening file updates tree to opened file's parent directory", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_file_result", "/projects/markz/notes.md");
    });
    await page.keyboard.press("Control+o");
    await page.waitForSelector('.tab:has-text("notes.md")', { timeout: 5000 });

    await page.click('.activity-btn[aria-label="Files"]');
    await expect(page.locator(".file-tree-breadcrumbs")).toContainText("markz");
    await expect(page.locator(".tree-file").first()).toBeVisible();
  });

  test("switching tabs updates tree to active tab's parent directory", async ({ page }) => {
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

    await page.click('.activity-btn[aria-label="Files"]');

    const breadcrumbs = page.locator(".file-tree-breadcrumbs");
    await expect(breadcrumbs).toContainText("folder-b");

    await page.locator('.tab:has-text("file-a.md")').click();
    await expect(breadcrumbs).toContainText("folder-a");
    await expect(breadcrumbs).not.toContainText("folder-b");

    await page.locator('.tab:has-text("file-b.md")').click();
    await expect(breadcrumbs).toContainText("folder-b");
    await expect(breadcrumbs).not.toContainText("folder-a");
  });

  test("closing all file tabs clears the tree", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("__e2e_open_file_result", "/x/f.md");
    });
    await page.keyboard.press("Control+o");
    await page.waitForSelector('.tab:has-text("f.md")', { timeout: 5000 });

    await page.click('.activity-btn[aria-label="Files"]');
    await expect(page.locator(".file-tree-breadcrumbs")).toContainText("x");

    await page.locator('.tab:has-text("f.md") .tab-close').click();

    await expect(page.locator(".file-tree-scroller .empty-state")).toBeVisible();
    await expect(page.locator(".file-tree-scroller .empty-state h3")).toContainText("No folder open");
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
    await expect(page.locator(".tree-open-folder")).toBeVisible();
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
