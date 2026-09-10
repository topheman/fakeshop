import { defineConfig, devices } from "@playwright/test";

/**
 * Not 3000: `next dev` owns that port, and a dev server never prefetches, so
 * reusing it would make every instant-navigation assertion below meaningless.
 * The suite always builds and serves its own production server.
 */
const port = Number(process.env.E2E_PORT ?? 3030);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- --port ${port}`,
    url: baseURL,
    // Both halves of the command need it: the flag decides whether the testing
    // API is compiled into the build, and whether the server exposes it.
    env: { NEXT_E2E_TESTING: "1" },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
