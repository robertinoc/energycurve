import { expect, type Page } from "@playwright/test"

/**
 * Why a test failed, when the answer is "this build was made without an
 * environment" rather than "the product is broken".
 *
 * ## The failure this exists to stop repeating
 *
 * Two assertions in this suite — that saying yes to analytics lets analytics
 * start, and that the login page offers a way to sign up — can only be true if
 * the build carries `NEXT_PUBLIC_POSTHOG_KEY` and the WorkOS variables. Both
 * live in `.env.local`, which is untracked, **so a fresh `git worktree` does
 * not inherit it**.
 *
 * Every batch since the E2E suite landed ran it from a worktree, watched those
 * two specs fail across four browsers, correctly concluded the failures were
 * not from its own branch, and wrote them down as "pre-existing on `main`".
 * Eight red rows travelled from handoff to handoff looking like an unowned
 * product defect. Verified on 25/09/2026: on `main`, untouched, with
 * `.env.local` present, all 37 pass.
 *
 * So neither the tests nor the product were wrong. The instrument was being
 * read in a room it could not measure in — and the instrument said nothing
 * about that, which is the part worth fixing. `expected 0 to be greater than 0`
 * is a sentence about a number; the sentences below are about what to do.
 */

const FIX =
  "Build from a checkout that has `.env.local` (it is untracked, so a fresh " +
  "`git worktree` will not have it), or export the variables before " +
  "`npm run build` — NEXT_PUBLIC_* are inlined at build time, so exporting " +
  "them only for `npx playwright test` is too late."

/**
 * Asserts analytics could start at all, before asking whether consent let it.
 *
 * Called *after* the accept click, since that is when the absence becomes
 * visible; it turns "no cookies appeared" into "no cookies could ever have
 * appeared, and here is why".
 */
export function expectAnalyticsConfigured(cookieCount: number) {
  expect(
    cookieCount,
    `No PostHog cookie appeared after accepting.\n\n` +
      `If this build has no NEXT_PUBLIC_POSTHOG_KEY, analytics cannot start ` +
      `whatever the visitor answers, and this assertion cannot pass — the ` +
      `failure is the build's configuration, not the consent gate.\n\n${FIX}`
  ).toBeGreaterThan(0)
}

/**
 * True when the page is the "WorkOS is not configured" screen rather than the
 * login form. Detected by its own copy: the page renders `SetupRequiredState`
 * with that heading, and it is the app telling you the same thing this helper
 * would have had to guess at.
 */
export async function isSetupRequiredScreen(page: Page): Promise<boolean> {
  return page.getByText(/cannot start the login flow yet/i).isVisible()
}

/** The message for a login-page assertion that failed for want of WorkOS. */
export const LOGIN_NOT_CONFIGURED =
  "The login page served a setup screen instead of a form: this build has no " +
  `WorkOS configuration, so there is no sign-up link for the test to find. ` +
  `The link itself is not what failed.\n\n${FIX}`
