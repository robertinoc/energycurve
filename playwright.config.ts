import { defineConfig, devices } from "@playwright/test"

/**
 * End-to-end coverage of the surface a visitor can reach without an account.
 *
 * ## What this can and cannot cover
 *
 * Authentication is WorkOS-hosted, so a real signup in CI would mean creating
 * accounts against a third party on every pull request — slow, stateful, and
 * dependent on someone else's uptime for our build to pass. So these tests stop at
 * the login wall, and assert that the wall is there.
 *
 * That is a smaller scope than "end to end" usually implies, and worth naming
 * plainly rather than letting a green tick imply more. What it does buy: the twelve
 * smoke-test rows that were being checked by hand against production — landing
 * copy, pricing, the legal pages, the Spanish routes, robots and sitemap, the
 * health probe, and the redirect that protects the dashboard — now run on every
 * PR, before a deploy rather than after one.
 *
 * The authenticated flow (import → analyse → fix → export) stays a manual row in
 * the tracker. Covering it needs a seeded test account and a way to sign in without
 * WorkOS, which is a real piece of work rather than a config change.
 */
export default defineConfig({
  testDir: "./e2e",
  // Nothing here mutates shared state, so parallel is safe and keeps CI short.
  fullyParallel: true,
  // A test that only passes on a retry is a flaky test, and a flaky suite is worse
  // than a smaller one — it trains everyone to re-run instead of to look.
  retries: 0,
  // Refuse to pass if a .only was committed: it would silently narrow the suite to
  // one test while still reporting green.
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: "http://127.0.0.1:3010",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    // The production build, not `next dev`: these assert on rendered metadata and
    // structured data, and dev-only behaviour (no minification, different caching,
    // React's development warnings) is not what ships.
    command: "npm run start -- --port 3010",
    url: "http://127.0.0.1:3010",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
