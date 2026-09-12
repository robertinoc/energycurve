import { defineConfig, devices } from "@playwright/test"

import {
  accountFor,
  storageStatePath,
  type TestPlan,
} from "./e2e/helpers/accounts"

/**
 * The four public projects run every spec except the two kinds that need a
 * session. Without this they would each pick up the authenticated specs and
 * run them signed out, where every one would fail on a redirect to /login and
 * say nothing about the product.
 */
const PUBLIC_IGNORES = [/auth\.setup\.ts/, /\.auth\.spec\.ts/]

const AUTH_PLANS: TestPlan[] = ["free", "pro", "proPlus"]

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
 * ## The authenticated half (2026-09-12)
 *
 * The scaffolding for it now exists: a `setup` project signs in once per plan
 * and caches the session, and three `auth-*` projects run the specs that need
 * one. What it still needs is the accounts themselves, which are created by
 * hand once — signup is a WorkOS flow with email verification in the middle,
 * and automating that would tie every CI run to somebody's inbox.
 *
 * Until `.env.e2e.local` exists, those projects **skip with a stated reason**
 * rather than fail or pass. All three outcomes were available and only one is
 * honest: failing would paint CI red on every machine without the credentials
 * until people stopped reading the colour, and passing would put a green tick
 * over tests that never ran — the exact shape of the two injected defects this
 * audit failed to catch, where the instrument reported on itself instead of on
 * the product.
 */
/**
 * Dedicated by default so a dev server on the app's usual port is neither
 * reused nor fought over. Override with E2E_PORT if 3010 is occupied.
 */
const PORT = process.env.E2E_PORT ?? "3010"

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
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },

  projects: [
    /**
     * Three engines, not one. The August round's most expensive finding was a
     * platform bug, not a logic bug — exports silently failed to save on iOS
     * because Safari cancels a download when the object URL is revoked
     * synchronously, and ignores `download` on blob URLs entirely. Chromium
     * would never have caught it.
     *
     * WebKit here is desktop Safari's engine; `mobile-safari` adds the touch
     * and viewport emulation. Firefox is cheap insurance on rendering and on
     * `<details>`, which the FAQ relies on shipping its answers in the HTML.
     */
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: PUBLIC_IGNORES,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testIgnore: PUBLIC_IGNORES,
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testIgnore: PUBLIC_IGNORES,
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 15"] },
      testIgnore: PUBLIC_IGNORES,
    },

    /**
     * Signs in once per plan and caches the session. A setup *project* rather
     * than `globalSetup` so a broken login is a named red row in the report
     * instead of a crash before the run starts.
     */
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    /**
     * The authenticated suite: one project per plan, because what separates
     * FREE from PRO from PRO+ is which gates open, and a single signed-in
     * session could only ever test one side of each.
     *
     * Chromium only, deliberately. The public suite runs four engines because
     * its findings were rendering and platform bugs; these assert on gating and
     * data ownership, which are server decisions and identical in every
     * browser. Running them four times would quadruple CI for no new
     * information. The one authenticated flow with a known platform-specific
     * failure — the export download on iOS — belongs in `mobile-safari` and
     * gets added there when it is written, rather than fanning out everything.
     *
     * `storageState` is only wired when the account exists. Pointing it at a
     * file that was never written makes Playwright throw while building the
     * context, which would report a missing credential as a broken browser.
     */
    ...AUTH_PLANS.map((plan) => ({
      name: `auth-${plan}`,
      testMatch: /\.auth\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: accountFor(plan) ? storageStatePath(plan) : undefined,
      },
    })),
  ],

  webServer: {
    // The production build, not `next dev`: these assert on rendered metadata and
    // structured data, and dev-only behaviour (no minification, different caching,
    // React's development warnings) is not what ships.
    command: `npm run start -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    // Never reuse, not even locally. This used to be `!process.env.CI`, and on
    // 2026-09-11 a local run reported four failures that did not exist: port
    // 3010 was held by a `next dev` from another worktree, so the suite quietly
    // tested a different branch, in dev mode, against the config directly above
    // that insists on the production build. A dev server also serves an
    // unminified, differently-cached app, so the assertions were not the ones
    // this file thinks it makes.
    //
    // Starting a server costs seconds; a failure that is not real costs an hour
    // and teaches everyone to re-run instead of to look — the same thing
    // `retries: 0` exists to prevent. Override the port with E2E_PORT when
    // something else must hold 3010.
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
