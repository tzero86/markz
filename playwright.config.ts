import { defineConfig, devices } from "@playwright/test";

// Controls whether Playwright reuses an already-running dev server.
// Default: false (always start a fresh server). Set REUSE_SERVER=1 to reuse.
const reuseExistingServer = process.env.REUSE_SERVER === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Always build fresh before serving. For repeated local runs, pre-build
    // manually and set REUSE_SERVER=1 to skip the build step.
    command: reuseExistingServer
      ? "npx vite preview --port 4173"
      : "npm run build && npx vite preview --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer,
    timeout: 180_000,
  },
});
