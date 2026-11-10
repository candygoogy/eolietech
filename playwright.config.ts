import { defineConfig, devices } from "@playwright/test";

const PORT = 8787;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // Safari's engine. Playwright's Windows WebKit has no OffscreenCanvas and no SharedArrayBuffer, so
    // the specs that need them skip here (reason in each); e2e/console.ts tolerates one known
    // WebKit-only CSP message. Real Safari 16.4+ has both: check those tools on a device.
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  // Production-shaped: astro build + wrangler dev (static assets, _headers, _redirects, Worker).
  webServer: {
    command: "npm run preview",
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
