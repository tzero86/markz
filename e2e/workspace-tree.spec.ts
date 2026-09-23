import { test, expect, type Page } from "@playwright/test";
import { tauriMockInitFunc } from "./tauri-mock";

/**
 * Regression coverage for the two sidebar complaints that motivated the
 * `.sidebar` flex fix:
 *   1. a long file list had no vertical scroll at all (the sidebar sized to its
 *      content, so `overflow: hidden` clipped the tree instead of scrolling it);
 *   2. the tree behaved as a separate thing from the tab strip (opening a stray
 *      file re-rooted or evicted the folder the tree was showing).
 *
 * All assertions are on rendered geometry / DOM the user can see; nothing here
 * reaches into Svelte internals.
 */

const ROOT = "/e2e-workspace";

type SeedNode = {
  name: string;
  path: string;
  rel_path: string;
  is_dir: boolean;
  children: SeedNode[];
};

function file(root: string, rel: string): SeedNode {
  const segments = rel.split("/");
  return {
    name: segments[segments.length - 1],
    path: `${root}/${rel}`,
    rel_path: rel,
    is_dir: false,
    children: [],
  };
}

function dir(root: string, rel: string, children: SeedNode[]): SeedNode {
  const segments = rel.split("/");
  return {
    name: segments[segments.length - 1],
    path: `${root}/${rel}`,
    rel_path: rel,
    is_dir: true,
    children,
  };
}

/** 120 root files plus one nested directory — the shape that used to be
 *  clipped instead of scrolled. Directories come first, matching the backend
 *  ordering the default fixture uses, so the last rendered node is a file. */
const BIG_TREE: SeedNode[] = [
  dir(ROOT, "nested", [file(ROOT, "nested/inner.md")]),
  ...Array.from({ length: 120 }, (_, i) => file(ROOT, `file-${String(i + 1).padStart(3, "0")}.md`)),
];

const TWO_FILES: SeedNode[] = [file(ROOT, "a.md"), file(ROOT, "b.md")];

const DEEP_TREE: SeedNode[] = [
  dir(ROOT, "docs", [
    dir(ROOT, "docs/guides", [
      dir(ROOT, "docs/guides/deep", [file(ROOT, "docs/guides/deep/note.md")]),
    ]),
  ]),
  file(ROOT, "notes.md"),
];

const DEEP4_TREE: SeedNode[] = [
  dir(ROOT, "a", [
    dir(ROOT, "a/b", [
      dir(ROOT, "a/b/c", [dir(ROOT, "a/b/c/d", [file(ROOT, "a/b/c/d/leaf.md")])]),
    ]),
  ]),
];

const NOTES_TREE: SeedNode[] = [dir(ROOT, "docs", [file(ROOT, "docs/readme.md")]), file(ROOT, "notes.md")];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockInitFunc);
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

function node(page: Page, path: string) {
  return page.locator(`.tree-node[data-tree-path="${path}"]`);
}

/** Seed the mocked tree, open `root` through the Files pane's empty state. */
async function openFolder(page: Page, root: string, tree: SeedNode[]) {
  await page.evaluate(
    ([r, t]) => {
      localStorage.setItem("__e2e_workspace_files", JSON.stringify(t));
      localStorage.setItem("__e2e_open_folder_result", r);
    },
    [root, tree] as const
  );
  await page.click('.activity-btn[aria-label="Files"]');
  await page.locator(".file-tree-scroller .btn-secondary").click();
  await page.waitForSelector(".tree-node", { timeout: 5000 });
}

async function scrollMetrics(page: Page, selector: string) {
  return await page.locator(selector).evaluate((el) => ({
    overflowY: getComputedStyle(el).overflowY,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));
}

async function scrollToBottom(page: Page, selector: string) {
  const scroller = page.locator(selector);
  await scroller.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  return scroller;
}

test.describe("File tree vertical scrolling", () => {
  test("a long file list overflows its container and scrolls to the last file", async ({ page }) => {
    await openFolder(page, ROOT, BIG_TREE);

    const metrics = await scrollMetrics(page, ".file-tree-scroller");
    expect(metrics.overflowY, "the tree scroller must own the vertical overflow").toBe("auto");
    expect(
      metrics.scrollHeight,
      `expected the tree to overflow its container (scrollHeight ${metrics.scrollHeight} vs clientHeight ${metrics.clientHeight})`
    ).toBeGreaterThan(metrics.clientHeight);

    const scroller = await scrollToBottom(page, ".file-tree-scroller");
    expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

    const last = node(page, `${ROOT}/file-120.md`);
    await expect(last).toContainText("file-120.md");
    await expect(last).toBeInViewport();
    await expect(node(page, `${ROOT}/file-001.md`)).not.toBeInViewport();
  });

  test("header and search box stay pinned while the tree scrolls", async ({ page }) => {
    await openFolder(page, ROOT, BIG_TREE);

    const header = page.locator(".file-tree-header");
    const searchBox = page.locator(".search-box");
    const headerBefore = await header.boundingBox();
    const searchBefore = await searchBox.boundingBox();

    await scrollToBottom(page, ".file-tree-scroller");

    await expect(header).toBeVisible();
    await expect(searchBox).toBeVisible();
    const headerAfter = await header.boundingBox();
    const searchAfter = await searchBox.boundingBox();
    expect(Math.abs(headerAfter!.y - headerBefore!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(headerAfter!.x - headerBefore!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(searchAfter!.y - searchBefore!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(searchAfter!.x - searchBefore!.x)).toBeLessThanOrEqual(1);
  });

  test("the sidebar is bounded by the window instead of growing with the tree", async ({ page }) => {
    await openFolder(page, ROOT, BIG_TREE);

    const rows = await page.locator(".tree-node").count();
    expect(rows).toBeGreaterThan(100);
    const rowHeight = (await page.locator(".tree-node").first().boundingBox())!.height;
    const sidebarHeight = (await page.locator(".sidebar").boundingBox())!.height;
    const wrapperHeight = (await page.locator(".sidebar-wrapper").boundingBox())!.height;

    expect(
      sidebarHeight,
      `sidebar must be clipped to its container, not sized to ${rows} rows of ~${rowHeight}px`
    ).toBeLessThan(rows * rowHeight);
    expect(
      Math.abs(sidebarHeight - wrapperHeight),
      `sidebar height ${sidebarHeight} should match its wrapper ${wrapperHeight}`
    ).toBeLessThanOrEqual(4);
  });

  test("keyboard focus on the last node does not push the sidebar open", async ({ page }) => {
    await openFolder(page, ROOT, BIG_TREE);
    const scroller = page.locator(".file-tree-scroller");
    const sidebarHeightBefore = (await page.locator(".sidebar").boundingBox())!.height;

    await node(page, `${ROOT}/file-001.md`).focus();
    await page.keyboard.press("End");

    await expect(node(page, `${ROOT}/file-120.md`)).toBeFocused();
    await expect(node(page, `${ROOT}/file-120.md`)).toBeInViewport();
    expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

    const metrics = await scrollMetrics(page, ".file-tree-scroller");
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
    expect(Math.abs((await page.locator(".sidebar").boundingBox())!.height - sidebarHeightBefore)).toBeLessThanOrEqual(
      1
    );
  });
});

test.describe("Outline pane scrolling", () => {
  test("a long outline scrolls inside the shared sidebar scroller", async ({ page }) => {
    const docPath = "/outline-scroll/long.md";
    const content =
      "# Title\n\n" + Array.from({ length: 60 }, (_, i) => `## Heading ${i + 1}`).join("\n\n") + "\n";
    await page.evaluate(
      ([path, text]) => {
        localStorage.setItem("__e2e_file_contents", JSON.stringify({ [path]: text }));
        localStorage.setItem("__e2e_open_file_result", path);
      },
      [docPath, content] as const
    );
    await page.keyboard.press("Control+o");
    await page.waitForSelector('.tab:has-text("long.md")', { timeout: 5000 });

    await page.click('.activity-btn[aria-label="Outline"]');
    const scroller = page.locator(".toc-scroller");
    await expect(scroller.locator(".toc-link").first()).toBeVisible();
    await expect(scroller.locator(".toc-link")).toHaveCount(61);

    const metrics = await scrollMetrics(page, ".toc-scroller");
    expect(metrics.overflowY, "the outline must own the vertical overflow").toBe("auto");
    expect(
      metrics.scrollHeight,
      `expected the outline to overflow (scrollHeight ${metrics.scrollHeight} vs clientHeight ${metrics.clientHeight})`
    ).toBeGreaterThan(metrics.clientHeight);

    const scrolled = await scrollToBottom(page, ".toc-scroller");
    expect(await scrolled.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await expect(scroller.locator(".toc-link").last()).toBeInViewport();
  });
});

test.describe("Tree and tab strip stay in sync", () => {
  test("Ctrl+T leaves the folder the tree is showing untouched", async ({ page }) => {
    await openFolder(page, ROOT, NOTES_TREE);
    const crumbs = page.locator(".file-tree-breadcrumbs");
    await expect(crumbs).toHaveAttribute("title", ROOT);

    await page.keyboard.press("Control+t");
    await expect(page.locator(".tab.active .tab-title")).toHaveText("Untitled");

    await expect(crumbs).toHaveAttribute("title", ROOT);
    await expect(node(page, `${ROOT}/notes.md`)).toBeVisible();
    await expect(node(page, `${ROOT}/notes.md`)).not.toHaveClass(/active/);
  });

  test("opening a file outside the root keeps the folder open", async ({ page }) => {
    await openFolder(page, ROOT, NOTES_TREE);
    const crumbs = page.locator(".file-tree-breadcrumbs");
    await expect(crumbs).toHaveAttribute("title", ROOT);

    await page.evaluate(() => localStorage.setItem("__e2e_open_file_result", "/elsewhere/stray.md"));
    await page.keyboard.press("Control+o");
    await expect(page.locator(".tab.active .tab-title")).toHaveText("stray.md");

    await expect(crumbs).toHaveAttribute("title", ROOT);
    await expect(node(page, `${ROOT}/notes.md`)).toBeVisible();
  });

  test("opening a deep file inside the root expands its ancestors without re-rooting", async ({ page }) => {
    await openFolder(page, ROOT, DEEP_TREE);
    const crumbs = page.locator(".file-tree-breadcrumbs");
    await expect(crumbs).toHaveAttribute("title", ROOT);

    await page.evaluate((p) => localStorage.setItem("__e2e_open_file_result", p), `${ROOT}/docs/guides/deep/note.md`);
    await page.keyboard.press("Control+o");
    await page.waitForSelector('.tab:has-text("note.md")', { timeout: 5000 });

    await expect(crumbs).toHaveAttribute("title", ROOT);
    for (const rel of ["docs", "docs/guides", "docs/guides/deep"]) {
      await expect(node(page, `${ROOT}/${rel}`)).toHaveAttribute("aria-expanded", "true");
    }
    await expect(page.locator(".tree-node.active")).toHaveAttribute(
      "data-tree-path",
      `${ROOT}/docs/guides/deep/note.md`
    );
    await expect(node(page, `${ROOT}/docs/guides/deep/note.md`)).toContainText("note.md");
  });

  test("clicking a tab activates that file's node in the tree", async ({ page }) => {
    await openFolder(page, ROOT, TWO_FILES);

    await node(page, `${ROOT}/a.md`).click();
    await expect(page.locator(".tab.active .tab-title")).toHaveText("a.md");
    await expect(page.locator(".tree-node.active")).toHaveAttribute("data-tree-path", `${ROOT}/a.md`);

    await node(page, `${ROOT}/b.md`).click();
    await expect(page.locator(".tab.active .tab-title")).toHaveText("b.md");
    await expect(page.locator(".tree-node.active")).toHaveAttribute("data-tree-path", `${ROOT}/b.md`);

    await page.locator('.tab:has-text("a.md")').click();
    await expect(page.locator(".tab.active .tab-title")).toHaveText("a.md");
    await expect(page.locator(".tree-node.active")).toHaveAttribute("data-tree-path", `${ROOT}/a.md`);
  });

  test("opening a folder keeps the active tab and re-roots the tree", async ({ page }) => {
    const untitledBefore = await page.locator('.tab:has-text("Untitled")').count();

    await page.evaluate(() => localStorage.setItem("__e2e_open_file_result", "/other-project/file.md"));
    await page.keyboard.press("Control+o");
    await page.waitForSelector('.tab:has-text("file.md")', { timeout: 5000 });
    await expect(page.locator(".tab.active .tab-title")).toHaveText("file.md");

    await page.evaluate(
      ([r, t]) => {
        localStorage.setItem("__e2e_workspace_files", JSON.stringify(t));
        localStorage.setItem("__e2e_open_folder_result", r);
      },
      [ROOT, NOTES_TREE] as const
    );
    await page.locator('.titlebar [aria-label="Open folder"]').click();

    await expect(page.locator(".tab.active .tab-title")).toHaveText("file.md");
    await expect(page.locator('.tab:has-text("Untitled")')).toHaveCount(untitledBefore);

    await page.click('.activity-btn[aria-label="Files"]');
    await expect(page.locator(".file-tree-breadcrumbs")).toHaveAttribute("title", ROOT);
    await expect(node(page, `${ROOT}/notes.md`)).toBeVisible();
  });
});

test.describe("Deeply nested tree expansion", () => {
  test("expanding level by level reveals the leaf and opening it marks every ancestor", async ({ page }) => {
    await openFolder(page, ROOT, DEEP4_TREE);

    const levels = ["a", "a/b", "a/b/c", "a/b/c/d"];
    for (const rel of levels) {
      const dirNode = node(page, `${ROOT}/${rel}`);
      await dirNode.click();
      await expect(dirNode).toHaveAttribute("aria-expanded", "true");
    }

    const leaf = node(page, `${ROOT}/a/b/c/d/leaf.md`);
    await expect(leaf).toBeVisible();
    await leaf.click();
    await expect(page.locator(".tab.active .tab-title")).toHaveText("leaf.md");

    for (const rel of levels) {
      await expect(node(page, `${ROOT}/${rel}`)).toHaveAttribute("aria-expanded", "true");
    }
    await expect(page.locator(".tree-node.active")).toHaveAttribute(
      "data-tree-path",
      `${ROOT}/a/b/c/d/leaf.md`
    );
  });
});
