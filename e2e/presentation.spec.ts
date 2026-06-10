import { test, expect } from "@playwright/test";
import { tauriMockInitFunc } from "./tauri-mock"

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockInitFunc);
  await page.goto("/");
  await page.waitForSelector(".app", { timeout: 10000 });
});

test("starts presentation mode via command palette", async ({ page }) => {
  await page.click('.app');
  await page.keyboard.press("Control+Shift+P");
  await page.waitForSelector(".palette-overlay", { timeout: 3000 });

  const item = page.locator('.palette-item').filter({ hasText: "Start Presentation" });
  await expect(item).toBeVisible({ timeout: 3000 });
  await item.click();

  await expect(page.locator(".presentation-overlay")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".slide-counter")).toHaveText("1 / 2");
});

test("starts presentation mode via F5", async ({ page }) => {
  await page.click('.app');
  await page.keyboard.press("F5");
  await expect(page.locator(".presentation-overlay")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".slide-counter")).toHaveText("1 / 2");
});

test("navigates slides with arrow keys", async ({ page }) => {
  await page.click('.app');
  await page.keyboard.press("F5");
  await expect(page.locator(".presentation-overlay")).toBeVisible({ timeout: 5000 });

  // Should start on slide 1
  await expect(page.locator(".slide-counter")).toHaveText("1 / 2");

  // Next slide
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".slide-counter")).toHaveText("2 / 2");

  // Previous slide
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".slide-counter")).toHaveText("1 / 2");
});

test("closes presentation with Escape", async ({ page }) => {
  await page.click('.app');
  await page.keyboard.press("F5");
  await expect(page.locator(".presentation-overlay")).toBeVisible({ timeout: 5000 });

  await page.keyboard.press("Escape");
  await expect(page.locator(".presentation-overlay")).not.toBeVisible({ timeout: 3000 });
});

test("closes presentation with Q key", async ({ page }) => {
  await page.click('.app');
  await page.keyboard.press("F5");
  await expect(page.locator(".presentation-overlay")).toBeVisible({ timeout: 5000 });

  await page.keyboard.press("q");
  await expect(page.locator(".presentation-overlay")).not.toBeVisible({ timeout: 3000 });
});

test("navigates slides with space key", async ({ page }) => {
  await page.click('.app');
  await page.keyboard.press("F5");
  await expect(page.locator(".presentation-overlay")).toBeVisible({ timeout: 5000 });

  await expect(page.locator(".slide-counter")).toHaveText("1 / 2");
  await page.keyboard.press(" ");
  await expect(page.locator(".slide-counter")).toHaveText("2 / 2");
});

test("previous button is disabled on first slide", async ({ page }) => {
  await page.click('.app');
  await page.keyboard.press("F5");
  await expect(page.locator(".presentation-overlay")).toBeVisible({ timeout: 5000 });

  await page.mouse.move(100, 100);
  const prevBtn = page.locator('.ctrl-btn').first();
  await expect(prevBtn).toBeDisabled();
});

test("next button is disabled on last slide", async ({ page }) => {
  await page.click('.app');
  await page.keyboard.press("F5");
  await expect(page.locator(".presentation-overlay")).toBeVisible({ timeout: 5000 });

  // Go to last slide
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".slide-counter")).toHaveText("2 / 2");

  await page.mouse.move(100, 100);
  const nextBtn = page.locator('.ctrl-btn').nth(1);
  await expect(nextBtn).toBeDisabled();
});

test("slide counter reflects current slide", async ({ page }) => {
  await page.click('.app');
  await page.keyboard.press("F5");
  await expect(page.locator(".presentation-overlay")).toBeVisible({ timeout: 5000 });

  await expect(page.locator(".slide-counter")).toHaveText("1 / 2");

  // Go to next slide
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".slide-counter")).toHaveText("2 / 2");
});

test("clicking next button navigates to next slide", async ({ page }) => {
  await page.click('.app');
  await page.keyboard.press("F5");
  await expect(page.locator(".presentation-overlay")).toBeVisible({ timeout: 5000 });

  await expect(page.locator(".slide-counter")).toHaveText("1 / 2");

  // Mouse move to reveal controls, click next
  await page.mouse.move(100, 100);
  await page.locator('.ctrl-btn').nth(1).click();
  await expect(page.locator(".slide-counter")).toHaveText("2 / 2");
});

test("Home key goes to first slide", async ({ page }) => {
  await page.click('.app');
  await page.keyboard.press("F5");
  await expect(page.locator(".presentation-overlay")).toBeVisible({ timeout: 5000 });

  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".slide-counter")).toHaveText("2 / 2");

  await page.keyboard.press("Home");
  await expect(page.locator(".slide-counter")).toHaveText("1 / 2");
});

test("End key goes to last slide", async ({ page }) => {
  await page.click('.app');
  await page.keyboard.press("F5");
  await expect(page.locator(".presentation-overlay")).toBeVisible({ timeout: 5000 });

  await expect(page.locator(".slide-counter")).toHaveText("1 / 2");

  await page.keyboard.press("End");
  await expect(page.locator(".slide-counter")).toHaveText("2 / 2");
});

test("close button exits presentation", async ({ page }) => {
  await page.click('.app');
  await page.keyboard.press("F5");
  await expect(page.locator(".presentation-overlay")).toBeVisible({ timeout: 5000 });

  // Mouse move to reveal controls, then click close
  await page.mouse.move(100, 100);
  await page.locator('.close-btn').click();
  await expect(page.locator(".presentation-overlay")).not.toBeVisible({ timeout: 3000 });
});

/** Helper: set a custom slide deck via localStorage override, then start
 *  presentation mode via F5. Returns the total slide count. */
async function startWithDeck(page: any, slides: any[]) {
  await page.evaluate((s: any) => {
    localStorage.setItem("__e2e_slides_override", JSON.stringify({ title: "Test", author: null, theme: "default", slides: s }));
  }, slides);
  await page.click('.app');
  await page.keyboard.press("F5");
  await expect(page.locator(".presentation-overlay")).toBeVisible({ timeout: 5000 });
  const countText = await page.locator(".slide-counter").innerText();
  return parseInt(countText.split(" / ")[1] || "0");
}

test.describe("Content completeness", () => {
  test("all content blocks are visible across slides — no cutoff", async ({ page }) => {
    // Build a deck with varied content types: code, lists, table, blockquote
    const deck = [
      { kind: "title", title: "Project Overview", content: "<p>A comprehensive project document.</p>", level: 1, index: 0 },
      { kind: "content", title: "Requirements", content: "<p>The system must support:</p><ul><li>OAuth2 authentication</li><li>Rate limiting</li><li>Export to CSV</li></ul>", level: 2, index: 1 },
      { kind: "content", title: "Configuration", content: '<p>Set these environment variables:</p><pre><code>export FOO_PORT=8080\nexport FOO_DB_URL=postgresql://localhost/foo\nexport FOO_REDIS_URL=redis://localhost:6379\nexport FOO_TIMEOUT=30s</code></pre>', level: 2, index: 2 },
      { kind: "content", title: "Database", content: '<table><thead><tr><th>Table</th><th>Purpose</th></tr></thead><tbody><tr><td>users</td><td>Accounts</td></tr><tr><td>tokens</td><td>OAuth2</td></tr></tbody></table>', level: 2, index: 3 },
    ];
    const total = await startWithDeck(page, deck);

    let allText = "";
    for (let i = 0; i < total; i++) {
      allText += await page.locator(".slide-body").innerText() + "\n";
      if (i < total - 1) await page.keyboard.press("ArrowRight");
    }

    expect(allText).toContain("Project Overview");
    expect(allText).toContain("OAuth2 authentication");
    expect(allText).toContain("Rate limiting");
    expect(allText).toContain("export FOO_PORT=8080");
    expect(allText).toContain("export FOO_DB_URL=postgresql://localhost/foo");
    expect(allText).toContain("export FOO_REDIS_URL=redis://localhost:6379");
    expect(allText).toContain("export FOO_TIMEOUT=30s");
    expect(allText).toContain("users");
    expect(allText).toContain("tokens");
  });

  test("long code block is never cut off when it fits the canvas", async ({ page }) => {
    const codeLines = [];
    for (let i = 1; i <= 15; i++) codeLines.push("// Comment line " + i);
    const deck = [
      { kind: "title", title: "Code Demo", content: "<p>Large snippet below.</p>", level: 1, index: 0 },
      { kind: "content", title: "The Code", content: "<pre><code>" + codeLines.join("\\n") + "</code></pre>", level: 2, index: 1 },
      { kind: "content", title: "After", content: "<p>This text follows the code block.</p>", level: 2, index: 2 },
    ];
    const total = await startWithDeck(page, deck);

    let allText = "";
    for (let i = 0; i < total; i++) {
      allText += await page.locator(".slide-body").innerText() + "\n";
      if (i < total - 1) await page.keyboard.press("ArrowRight");
    }

    for (let i = 1; i <= 15; i++) {
      expect(allText).toContain("// Comment line " + i);
    }
    expect(allText).toContain("This text follows the code block");
  });

  test("content split across slides is complete end-to-end", async ({ page }) => {
    // Create 8 content slides, each with distinct markers
    const slides = [{ kind: "title", title: "Full Doc", content: "<p>Test document start</p>", level: 1, index: 0 }];
    for (let i = 1; i <= 8; i++) {
      slides.push({ kind: "content", title: "Section " + i, content: "<p>Content for section " + i + ": block-A-" + i + " and block-B-" + i + "</p>", level: 2, index: i });
    }
    const total = await startWithDeck(page, slides);
    expect(total).toBe(9);

    for (let i = 0; i < total; i++) {
      const text = await page.locator(".slide-body").innerText();
      if (i === 0) expect(text).toContain("Test document start");
      else {
        expect(text).toContain("Section " + i);
        expect(text).toContain("block-A-" + i);
        expect(text).toContain("block-B-" + i);
      }
      if (i < total - 1) await page.keyboard.press("ArrowRight");
    }
  });
  test("long paragraph is split across slides without losing text", async ({ page }) => {
    // Create a paragraph long enough that it won't fit on a single 1024x768 slide
    const words = [];
    for (let i = 1; i <= 600; i++) {
      words.push("word" + i);
    }
    const longPara = words.join(" ");
    const deck = [
      { kind: "title", title: "Long Paragraph", content: "<p>Intro.</p>", level: 1, index: 0 },
      { kind: "content", title: "Details", content: "<p>" + longPara + "</p>", level: 2, index: 1 },
    ];
    const total = await startWithDeck(page, deck);
    // Should have split into multiple slides (title + at least 2 content slides)
    expect(total).toBeGreaterThanOrEqual(3);
    let allText = "";
    for (let i = 0; i < total; i++) {
      allText += await page.locator(".slide-body").innerText() + "\n";
      if (i < total - 1) await page.keyboard.press("ArrowRight");
    }
    // All words should be present
    for (let i = 1; i <= 600; i++) {
      expect(allText).toContain("word" + i);
    }
  });
  test("long list is split across slides without losing items", async ({ page }) => {
    const items = [];
    for (let i = 1; i <= 30; i++) {
      items.push("<li>Item number " + i + " with some extra text to make it longer</li>");
    }
    const deck = [
      { kind: "title", title: "Long List", content: "<p>Intro.</p>", level: 1, index: 0 },
      { kind: "content", title: "Items", content: "<ul>" + items.join("") + "</ul>", level: 2, index: 1 },
    ];
    const total = await startWithDeck(page, deck);
    expect(total).toBeGreaterThanOrEqual(3);
    let allText = "";
    for (let i = 0; i < total; i++) {
      allText += await page.locator(".slide-body").innerText() + "\n";
      if (i < total - 1) await page.keyboard.press("ArrowRight");
    }
    for (let i = 1; i <= 30; i++) {
      expect(allText).toContain("Item number " + i);
    }
  });
  test("oversized table gets overflow warning instead of being silently cut off", async ({ page }) => {
    // A very tall table that exceeds the canvas height
    const rows = [];
    for (let i = 1; i <= 50; i++) {
      rows.push("<tr><td>Row " + i + " A</td><td>Row " + i + " B</td></tr>");
    }
    const deck = [
      { kind: "title", title: "Big Table", content: "<p>Intro.</p>", level: 1, index: 0 },
      { kind: "content", title: "Data", content: "<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody>" + rows.join("") + "</tbody></table>", level: 2, index: 1 },
    ];
    const total = await startWithDeck(page, deck);
    expect(total).toBeGreaterThanOrEqual(2);
    // Navigate to the content slide(s)
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);
    // At least one slide should have the overflow indicator
    const hasOverflow = await page.locator(".slide-html.overflow").count() > 0;
    expect(hasOverflow).toBe(true);
  });
});

test.describe("Slide breaks", () => {
  test("toolbar has slide break toggle button", async ({ page }) => {
    const btn = page.locator('.tool-btn[title="Edit slide breaks"]');
    await expect(btn).toBeVisible();
  });

  test("slide break mode toggle activates the button", async ({ page }) => {
    const btn = page.locator('.tool-btn[title="Edit slide breaks"]');
    await btn.click();
    // Title changes to "Exit..." when active; use a stable locator for the second click
    const activeBtn = page.locator('.tool-btn[title="Exit slide break mode"]');
    await expect(activeBtn).toBeVisible();
    await activeBtn.click();
    await expect(page.locator('.tool-btn[title="Edit slide breaks"]')).toBeVisible();
  });

  test("manual slide breaks are persisted and presentation starts", async ({ page }) => {
    // Set content with two sections
    await page.evaluate(() => {
      const store = (window as any).__markz_tabStore;
      const tab = store.getActiveTab();
      if (tab) {
        store.setContent("# Title\n\nPara 1\n\n## Section A\n\nPara 2\n\nPara 3\n\n## Section B\n\nPara 4\n");
      }
    });
    await page.waitForTimeout(200);

    // Set a slide break before "Para 3" (line 9) to split Section A
    await page.evaluate(() => {
      const store = (window as any).__markz_tabStore;
      store.setSlideBreaks([9]);
    });
    await page.waitForTimeout(100);

    // Verify breaks are persisted
    const breaks = await page.evaluate(() => {
      const store = (window as any).__markz_tabStore;
      return store.getActiveTab()?.slideBreaks;
    });
    expect(breaks).toContain(9);

    // Start presentation — should not crash
    await page.keyboard.press("F5");
    await expect(page.locator(".presentation-overlay")).toBeVisible({ timeout: 5000 });
  });
});
