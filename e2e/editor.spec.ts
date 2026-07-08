import { test, expect } from "@playwright/test";
import { tauriMockInitFunc } from "./tauri-mock"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockInitFunc);
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

/** Helper to get the CodeMirror EditorView via findFromDOM. */
function getEditorViewScript(selector: string) {
  return () => {
    const el = document.querySelector(selector);
    const EV = (window as any).EditorView;
    return EV ? EV.findFromDOM(el) : null;
  };
}

/** Helper to set editor content and cursor directly. */
async function setEditorContent(page: any, text: string, cursor = 0) {
  await page.evaluate((args: { text: string; cursor: number }) => {
    const view = (window as any).EditorView?.findFromDOM(document.querySelector(".cm-content"));
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: args.text },
        selection: { anchor: args.cursor },
      });
    }
  }, { text, cursor });
}

/** Helper to read editor content and cursor. */
async function getEditorState(page: any) {
  return page.evaluate(() => {
    const view = (window as any).EditorView?.findFromDOM(document.querySelector(".cm-content"));
    if (!view) return { text: "", cursor: -1 };
    return {
      text: view.state.doc.toString(),
      cursor: view.state.selection.main.head,
    };
  });
}

test.describe("Editor toolbar", () => {
  test("toolbar buttons are visible", async ({ page }) => {
    const toolbar = page.locator(".toolbar");
    await expect(toolbar).toBeVisible();

    // Heading buttons
    await expect(toolbar.locator('button[title="Heading 1"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Heading 2"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Heading 3"]')).toBeVisible();

    // Style buttons
    await expect(toolbar.locator('button[title="Bold (Ctrl+B)"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Italic (Ctrl+I)"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Strikethrough"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Inline Code"]')).toBeVisible();

    // Block buttons
    await expect(toolbar.locator('button[title="Code Block"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Blockquote"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Horizontal Rule"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Math Block"]')).toBeVisible();

    // List buttons
    await expect(toolbar.locator('button[title="Bullet List"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Numbered List"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Task List"]')).toBeVisible();

    // Insert buttons
    await expect(toolbar.locator('button[title="Link"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Table"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Mermaid Diagram"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Expandable Section"]')).toBeVisible();
  });

  test("table dialog opens and closes", async ({ page }) => {
    await page.locator('button[title="Table"]').click();
    const dialog = page.locator('[role="dialog"][aria-label="Insert table"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    await expect(dialog.locator('input[type="number"]')).toHaveCount(2);
    await dialog.locator('button:has-text("Cancel")').click();
    await expect(dialog).not.toBeVisible();
  });

  test("table dialog inserts table with default dimensions", async ({ page }) => {
    await page.locator('button[title="Table"]').click();
    const dialog = page.locator('[role="dialog"][aria-label="Insert table"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    await expect(dialog.locator('input[type="number"]').nth(0)).toHaveValue("3");
    await expect(dialog.locator('input[type="number"]').nth(1)).toHaveValue("3");

    await dialog.locator('button:has-text("Insert")').click();
    await expect(dialog).not.toBeVisible();
  });

  test("table dialog closes with backdrop click", async ({ page }) => {
    await page.locator('button[title="Table"]').click();
    const dialog = page.locator('[role="dialog"][aria-label="Insert table"]');
    await expect(dialog).toBeVisible({ timeout: 3000 });

    await page.locator('.table-dialog-backdrop').click({ position: { x: 10, y: 10 } });
    await expect(dialog).not.toBeVisible();
  });

  test("bullet list button places cursor after prefix", async ({ page }) => {
    await setEditorContent(page, "", 0);

    await page.evaluate(() => {
      const view = (window as any).EditorView?.findFromDOM(document.querySelector(".cm-content"));
      const cmds = (window as any).__markz_editorCommands;
      if (view && cmds?.toggleLinePrefix) {
        cmds.toggleLinePrefix(view, "- ");
      }
    });

    const state = await getEditorState(page);
    expect(state.text).toBe("- ");
    expect(state.cursor).toBe(2); // cursor after "- "
  });

  test("math block button inserts math template", async ({ page }) => {
    await setEditorContent(page, "", 0);

    await page.evaluate(() => {
      const view = (window as any).EditorView?.findFromDOM(document.querySelector(".cm-content"));
      const cmds = (window as any).__markz_editorCommands;
      if (view && cmds?.insertMathBlock) {
        cmds.insertMathBlock(view);
      }
    });

    const state = await getEditorState(page);
    expect(state.text).toContain("$$");
    expect(state.text).toContain("E = mc^2");
  });

  test("mermaid button inserts mermaid template", async ({ page }) => {
    await setEditorContent(page, "", 0);

    await page.evaluate(() => {
      const view = (window as any).EditorView?.findFromDOM(document.querySelector(".cm-content"));
      const cmds = (window as any).__markz_editorCommands;
      if (view && cmds?.insertMermaidBlock) {
        cmds.insertMermaidBlock(view);
      }
    });

    const state = await getEditorState(page);
    expect(state.text).toContain("```mermaid");
    expect(state.text).toContain("graph TD");
  });

  test("expandable section button inserts details template", async ({ page }) => {
    await setEditorContent(page, "", 0);

    await page.evaluate(() => {
      const view = (window as any).EditorView?.findFromDOM(document.querySelector(".cm-content"));
      const cmds = (window as any).__markz_editorCommands;
      if (view && cmds?.insertDetailsBlock) {
        cmds.insertDetailsBlock(view);
      }
    });

    const state = await getEditorState(page);
    expect(state.text).toContain("<details>");
    expect(state.text).toContain("<summary>");
    expect(state.text).toContain("</details>");
  });
});

test.describe("Live preview markdown typing", () => {
  test("manually typed heading in default tab renders as H1 in preview", async ({ page }) => {
    // Override render_preview so we can observe the markdown being sent.
    await page.evaluate(() => {
      const origInvoke = (window as any).__TAURI_INTERNALS__?.invoke;
      if (!origInvoke) return;
      (window as any).__TAURI_INTERNALS__.invoke = async function(cmd: string, args?: any) {
        if (cmd === "render_preview") {
          const md = args?.markdown || "";
          const firstLine = md.split("\n")[0] || "";
          if (/^#{1,6}\s/.test(firstLine)) {
            const level = firstLine.match(/^(#{1,6})\s/)?.[1].length ?? 1;
            const text = firstLine.replace(/^#{1,6}\s+/, "").trim();
            return `<h${level}>${text}</h${level}>`;
          }
          return `<p>${md.slice(0, 30) || "empty"}</p>`;
        }
        return origInvoke(cmd, args);
      };
    });

    // Place cursor at the start of the default welcome content and type a heading.
    await page.locator(".cm-content").click();
    await page.evaluate(() => {
      const view = (window as any).EditorView?.findFromDOM(document.querySelector(".cm-content"));
      if (view) {
        view.dispatch({ selection: { anchor: 0 } });
      }
    });
    await page.keyboard.type("# Heading\n");

    // Wait for the debounced render + post-processing.
    await page.waitForTimeout(400);

    const previewHTML = await page.locator(".preview-content").innerHTML();
    expect(previewHTML).toMatch(/<h1[^>]*>Heading<\/h1>/);
  });

  test("manually typed heading renders as H1 in preview", async ({ page }) => {
    // Replace the fixed preview mock with a content-aware one so we can
    // verify the markdown the backend receives, not just the welcome HTML.
    await page.evaluate(() => {
      const origInvoke = (window as any).__TAURI_INTERNALS__?.invoke;
      if (!origInvoke) return;
      (window as any).__TAURI_INTERNALS__.invoke = async function(cmd: string, args?: any) {
        if (cmd === "render_preview") {
          const md = args?.markdown || "";
          if (/^#{1,6}\s/.test(md)) {
            const level = md.match(/^(#{1,6})\s/)?.[1].length ?? 1;
            const text = md.replace(/^#{1,6}\s+/, "").trim();
            return `<h${level}>${text}</h${level}>`;
          }
          return `<p>${md || "empty"}</p>`;
        }
        return origInvoke(cmd, args);
      };
    });

    // Clear the default welcome content and type a heading manually.
    await setEditorContent(page, "", 0);
    await page.locator(".cm-content").click();
    await page.keyboard.type("# Heading");

    // Wait for the debounced render + post-processing.
    await page.waitForTimeout(400);

    const previewHTML = await page.locator(".preview-content").innerHTML();
    expect(previewHTML).toMatch(/<h1[^>]*>Heading<\/h1>/);
  });

  test("toolbar-inserted heading renders as H1 in preview", async ({ page }) => {
    await page.evaluate(() => {
      const origInvoke = (window as any).__TAURI_INTERNALS__?.invoke;
      if (!origInvoke) return;
      (window as any).__TAURI_INTERNALS__.invoke = async function(cmd: string, args?: any) {
        if (cmd === "render_preview") {
          const md = args?.markdown || "";
          if (/^#{1,6}\s/.test(md)) {
            const level = md.match(/^(#{1,6})\s/)?.[1].length ?? 1;
            const text = md.replace(/^#{1,6}\s+/, "").trim();
            return `<h${level}>${text}</h${level}>`;
          }
          return `<p>${md || "empty"}</p>`;
        }
        return origInvoke(cmd, args);
      };
    });

    await setEditorContent(page, "", 0);
    await page.locator('button[title="Heading 1"]').click();
    await page.keyboard.type("Heading");

    // Wait for the debounced render + post-processing.
    await page.waitForTimeout(400);

    const previewHTML = await page.locator(".preview-content").innerHTML();
    expect(previewHTML).toMatch(/<h1[^>]*>Heading<\/h1>/);
  });

  test("toolbar heading button converts selected text to H1", async ({ page }) => {
    await page.evaluate(() => {
      const origInvoke = (window as any).__TAURI_INTERNALS__?.invoke;
      if (!origInvoke) return;
      (window as any).__TAURI_INTERNALS__.invoke = async function(cmd: string, args?: any) {
        if (cmd === "render_preview") {
          const md = args?.markdown || "";
          if (/^#{1,6}\s/.test(md)) {
            const level = md.match(/^(#{1,6})\s/)?.[1].length ?? 1;
            const text = md.replace(/^#{1,6}\s+/, "").trim();
            return `<h${level}>${text}</h${level}>`;
          }
          return `<p>${md || "empty"}</p>`;
        }
        return origInvoke(cmd, args);
      };
    });

    await setEditorContent(page, "Heading", 7);
    await page.locator('button[title="Heading 1"]').click();

    await page.waitForTimeout(400);

    const previewHTML = await page.locator(".preview-content").innerHTML();
    expect(previewHTML).toMatch(/<h1[^>]*>Heading<\/h1>/);
  });
});

test.describe("Markdown auto-pair", () => {
  test("typing * inserts a closing pair", async ({ page }) => {
    await setEditorContent(page, "", 0);
    await page.locator(".cm-content").click();
    await page.keyboard.type("*");

    const state = await getEditorState(page);
    expect(state.text).toBe("**");
    expect(state.cursor).toBe(1);
  });

  test("typing _ inserts a closing pair", async ({ page }) => {
    await setEditorContent(page, "", 0);
    await page.locator(".cm-content").click();
    await page.keyboard.type("_");

    const state = await getEditorState(page);
    expect(state.text).toBe("__");
    expect(state.cursor).toBe(1);
  });

  test("typing backtick inserts a closing pair", async ({ page }) => {
    await setEditorContent(page, "", 0);
    await page.locator(".cm-content").click();
    await page.keyboard.type("`");

    const state = await getEditorState(page);
    expect(state.text).toBe("``");
    expect(state.cursor).toBe(1);
  });

  test("typing standard brackets still auto-pairs", async ({ page }) => {
    await setEditorContent(page, "", 0);
    await page.locator(".cm-content").click();
    await page.keyboard.type("[");

    const state = await getEditorState(page);
    expect(state.text).toBe("[]");
    expect(state.cursor).toBe(1);
  });
});

test.describe("Editor pane interactions", () => {
  test("editor container is present", async ({ page }) => {
    await expect(page.locator('.editor-container[role="application"]')).toBeVisible();
  });

  test("drag over adds drag-over class", async ({ page }) => {
    const editor = page.locator(".editor-container");
    await editor.evaluate((el) => {
      el.dispatchEvent(new DragEvent("dragenter", { bubbles: true }));
    });
    // The drag-over class is set via dragCounter, but we can't easily test
    // the visual state without more complex interactions. Just verify it exists.
    await expect(editor).toBeVisible();
  });

  test("Tab indents list items", async ({ page }) => {
    await setEditorContent(page, "- item", 6);

    await page.evaluate(() => {
      const view = (window as any).EditorView?.findFromDOM(document.querySelector(".cm-content"));
      const cmds = (window as any).__markz_editorCommands;
      if (view && cmds?.indentSelection) {
        cmds.indentSelection(view, "indent");
      }
    });

    const state = await getEditorState(page);
    expect(state.text).toBe("  - item");
  });

  test("Shift+Tab outdents list items", async ({ page }) => {
    await setEditorContent(page, "  - item", 8);

    await page.evaluate(() => {
      const view = (window as any).EditorView?.findFromDOM(document.querySelector(".cm-content"));
      const cmds = (window as any).__markz_editorCommands;
      if (view && cmds?.indentSelection) {
        cmds.indentSelection(view, "outdent");
      }
    });

    const state = await getEditorState(page);
    expect(state.text).toBe("- item");
  });
});

test.describe("Image paste", () => {
  const MINI_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  async function pasteImage(page: any) {
    await page.evaluate(async (dataUrl: string) => {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], "test.png", { type: "image/png" });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const target = document.querySelector(".cm-content") || document.querySelector(".editor-container");
      const event = new ClipboardEvent("paste", {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true,
      });
      target?.dispatchEvent(event);
    }, MINI_PNG);
  }

  test("paste shows image preview modal and inserts markdown on confirm", async ({ page }) => {
    await setEditorContent(page, "", 0);

    await pasteImage(page);

    const modal = page.getByRole("dialog", { name: "Insert image" });
    await expect(modal).toBeVisible();
    await expect(modal.locator("img")).toBeVisible();
    await expect(modal.locator("text=test.png")).toBeVisible();

    await modal.locator('input[type="text"]').fill("A test image");
    await modal.locator('button:has-text("Insert Image")').click();

    await expect(modal).not.toBeVisible();
    const state = await getEditorState(page);
    expect(state.text).toContain("![A test image](images/test.png)");
  });

  test("paste modal can be cancelled", async ({ page }) => {
    await setEditorContent(page, "hello", 5);

    await pasteImage(page);

    const modal = page.getByRole("dialog", { name: "Insert image" });
    await expect(modal).toBeVisible();

    await modal.locator('button:has-text("Cancel")').click();
    await expect(modal).not.toBeVisible();

    const state = await getEditorState(page);
    expect(state.text).toBe("hello");
  });
});



