import { test, expect } from "@playwright/test";
import { tauriMockScriptString } from "./tauri-mock";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(tauriMockScriptString);
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
