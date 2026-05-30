import { test, expect } from "@playwright/test";
import { tauriMockScriptString } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockScriptString);
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

test("capture hero split view", async ({ page }) => {
  await page.evaluate(() => {
    const editorView = (window as any).__markz_editorView;
    if (editorView) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: `# Project Overview\n\nThis is a **markdown** document with:\n\n- Live preview\n- KaTeX math: $E=mc^2$\n- Code blocks and syntax highlighting\n\n\`\`\`rust\nfn main() {\n    println!("Hello, MarkZ!");\n}\n\`\`\`\n\n> A blockquote for emphasis\n`,
        },
      });
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "site/screenshots/hero-split-view.png" });
});

test("capture workspace mode", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem("__e2e_open_folder_result", "/home/user/project");
    localStorage.setItem("__e2e_workspace_files", JSON.stringify([
      { name: "docs", path: "/home/user/project/docs", rel_path: "docs", is_dir: true, children: [
        { name: "readme.md", path: "/home/user/project/docs/readme.md", rel_path: "docs/readme.md", is_dir: false, children: [] },
        { name: "adr-001.md", path: "/home/user/project/docs/adr-001.md", rel_path: "docs/adr-001.md", is_dir: false, children: [] },
      ]},
      { name: "ROADMAP.md", path: "/home/user/project/ROADMAP.md", rel_path: "ROADMAP.md", is_dir: false, children: [] },
      { name: "src", path: "/home/user/project/src", rel_path: "src", is_dir: true, children: [
        { name: "main.rs", path: "/home/user/project/src/main.rs", rel_path: "src/main.rs", is_dir: false, children: [] },
      ]},
    ]));
  });
  await page.keyboard.press("Control+Shift+O");
  await page.waitForTimeout(400);
  const filesBtn = page.locator(".activity-bar .activity-btn").first();
  if (await filesBtn.isVisible().catch(() => false)) {
    await filesBtn.click();
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: "site/screenshots/workspace-mode.png" });
});

test("capture outline panel", async ({ page }) => {
  await page.evaluate(() => {
    const editorView = (window as any).__markz_editorView;
    if (editorView) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: `# Architecture Decision Record\n\n## Context\n\nWe need to choose a parser.\n\n## Decision\n\nUse [[Pulldown-Cmark]] for speed.\n\n## Consequences\n\n- Fast parsing\n- Good Rust ecosystem\n\nSee also [[ADR-001|Previous ADR]]\n`,
        },
      });
    }
  });
  await page.waitForTimeout(300);
  await page.keyboard.press("Control+b");
  await page.waitForTimeout(300);
  const outlineBtn = page.locator(".activity-bar .activity-btn").nth(1);
  if (await outlineBtn.isVisible().catch(() => false)) {
    await outlineBtn.click();
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: "site/screenshots/outline-panel.png" });
});

test("capture table editor", async ({ page }) => {
  await page.evaluate(() => {
    const editorView = (window as any).__markz_editorView;
    if (editorView) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: `# Sprint Planning\n\n| Task | Owner | Status |\n|------|-------|--------|\n| API design | Alice | Done |\n| Frontend | Bob | In Progress |\n| Testing | Carol | Todo |\n`,
        },
      });
    }
  });
  await page.waitForTimeout(400);
  const table = page.locator(".preview-scroller table").first();
  if (await table.isVisible().catch(() => false)) {
    await table.dblclick();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: "site/screenshots/table-editor.png" });
});

test("capture settings themes", async ({ page }) => {
  const settingsBtn = page.locator('[data-testid="settings-button"]').first();
  if (await settingsBtn.isVisible().catch(() => false)) {
    await settingsBtn.click();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: "site/screenshots/settings-themes.png" });
});

test("capture git diff", async ({ page }) => {
  await page.evaluate(() => {
    const editorView = (window as any).__markz_editorView;
    if (editorView) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: `# README\n\nA sample document with changes.\n`,
        },
      });
    }
  });
  await page.waitForTimeout(300);
  await page.keyboard.press("Control+Shift+D");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "site/screenshots/git-diff.png" });
});

test("capture mobile view", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "site/screenshots/mobile-view.png" });
});
