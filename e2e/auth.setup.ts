import { expect, test as setup, type Page } from "@playwright/test"

import {
  accountFor,
  skipReason,
  storageStatePath,
  type TestPlan,
} from "./helpers/accounts"

/**
 * Signs in once per plan and caches the browser state, so the authenticated
 * specs start already logged in instead of replaying a form sixty times.
 *
 * This runs as a Playwright *setup project* rather than `globalSetup` for one
 * reason that matters in practice: a setup project appears in the report. When
 * the login breaks — an expired password, a WorkOS redirect that changed — the
 * failure is a named row that says "authenticate as pro", not an opaque crash
 * before the run starts.
 *
 * Nothing here creates accounts. Signup is a third-party flow with email
 * verification in the middle, and automating it would make every CI run depend
 * on someone else's inbox. The accounts are made once, by hand (A1 in the test
 * plan); this only borrows their session.
 */

async function signIn(page: Page, email: string, password: string) {
  // `returnTo` is carried through the login form as a hidden field, so landing
  // on the dashboard is the app's own redirect rather than a second navigation
  // this helper invents. That means a redirect that breaks shows up here.
  await page.goto("/login?returnTo=%2Fdashboard")

  /**
   * `/login` renders a setup screen instead of a form when WorkOS is not
   * configured, and the form's inputs simply never appear. Without this check
   * the run fails on `#login-email` not existing, which reads as a renamed
   * selector and sends you into the component — the first time this happened
   * the actual cause was a worktree with no `.env.local`, three layers away
   * from where the error pointed.
   */
  const setupScreen = page.getByText(
    "EnergyCurve cannot start the login flow yet"
  )

  if (await setupScreen.isVisible().catch(() => false)) {
    throw new Error(
      "The app served a setup screen instead of a login form: WorkOS is not configured for this run. " +
        "Check that .env.local exists in the directory Playwright started the server from — a fresh git worktree does not inherit it, because it is untracked."
    )
  }

  await page.locator("#login-email").fill(email)
  await page.locator("#login-password").fill(password)
  await page.getByRole("button", { name: /log in|iniciar/i }).click()

  // Waiting for the URL rather than for a selector: any dashboard element could
  // be renamed, but "we are no longer on /login" is the actual claim, and a
  // wrong password leaves us on /login with an error rather than navigating.
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })

  // The session cookie is what gets serialised into storage state. If it is not
  // set, the state file would be written empty and every dependent test would
  // fail later with a confusing redirect instead of here with a clear one.
  const cookies = await page.context().cookies()
  expect(
    cookies.some((cookie) => cookie.value.length > 0),
    "signing in set no cookies, so there is no session to cache"
  ).toBe(true)
}

function authenticate(plan: TestPlan) {
  setup(`authenticate as ${plan}`, async ({ page }) => {
    const account = accountFor(plan)

    setup.skip(account === null, skipReason(plan))

    await signIn(page, account!.email, account!.password)
    await page.context().storageState({ path: storageStatePath(plan) })
  })
}

authenticate("free")
authenticate("pro")
authenticate("proPlus")
