import { expect, test, type Page } from "@playwright/test"

import { accountFor, skipReason, type TestPlan } from "./helpers/accounts"

/**
 * F3 — from a signed-in account to a first dashboard with data in it.
 *
 * ## What this covers, and what it deliberately does not
 *
 * It starts at the session, not at the signup form. Signup is a WorkOS-hosted
 * flow with email verification in the middle, so automating it would tie every
 * run to somebody's inbox and to a third party's uptime — the same reasoning
 * `playwright.config.ts` already records for why the accounts are made by hand.
 *
 * What it does cover is the part that actually breaks: the path a new user
 * walks the first time, which is the one nobody re-walks afterwards. Every
 * developer on this product has an account with playlists in it, so the empty
 * state is the screen least looked at and most often shipped broken.
 *
 * ## Why these skip in most environments
 *
 * Without `.env.e2e.local` there is no account to be, and these announce that
 * rather than failing or passing. Failing would paint CI red on every machine
 * without credentials until people stopped reading the colour; passing would
 * put a green tick over tests that never ran, which is the exact shape of the
 * two defects the 2026-09 audit injected and did not catch.
 */

/** Which plan this project is signed in as, read from the project name. */
function planFor(projectName: string): TestPlan | null {
  const match = /^auth-(free|pro|proPlus)$/.exec(projectName)

  return match ? (match[1] as TestPlan) : null
}

/** Skips with a stated reason when this project's account is not configured. */
function requireAccount(projectName: string): TestPlan {
  const plan = planFor(projectName)

  expect(plan, `${projectName} is not one of the auth-* projects`).not.toBeNull()
  test.skip(accountFor(plan!) === null, skipReason(plan!))

  return plan!
}

/**
 * The dashboard, loaded and settled.
 *
 * Asserts the URL rather than a selector: any element on the page could be
 * renamed, but "we are not on /login" is the actual claim, and a signed-out
 * redirect is the failure this guards against.
 */
async function openDashboard(page: Page) {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/dashboard/)
}

test.describe("a new user's first dashboard", () => {
  test("shows a way to bring a set in, before there is any set", async ({
    page,
  }, testInfo) => {
    requireAccount(testInfo.project.name)

    await openDashboard(page)

    // The import control is the one thing an empty dashboard has to offer,
    // because with nothing imported it is the only action that leads anywhere.
    // Located by the file input's `accept` list rather than by button text:
    // the copy is bilingual and changes, the set of formats the product reads
    // is a product fact.
    const fileInput = page.locator('input[type="file"]')

    await expect(fileInput.first()).toBeAttached()

    const accept = await fileInput.first().getAttribute("accept")

    expect(accept, "the import control accepts no DJ export formats").toMatch(
      /\.xml/
    )
    expect(accept).toMatch(/\.nml/)
    expect(accept).toMatch(/\.m3u8?/)
    expect(accept).toMatch(/\.csv/)
  })

  test("puts the account's plan on the page", async ({ page }, testInfo) => {
    const plan = requireAccount(testInfo.project.name)

    await openDashboard(page)

    // Not the label text, which is copy. What matters is that the page renders
    // *something* plan-shaped, because the alternative failure — a dashboard
    // that renders while billing state is silently undefined — is how a paid
    // user gets shown a free experience.
    const body = await page.locator("body").innerText()
    const mentionsAPlan = /free|pro\+?|plan/i.test(body)

    expect(mentionsAPlan, `no plan state rendered for ${plan}`).toBe(true)
  })

  test("offers the library and the playlists, and both load", async ({
    page,
  }, testInfo) => {
    requireAccount(testInfo.project.name)

    // The two destinations a first-time user reaches from the dashboard. Both
    // are server-rendered against an account that may have no rows at all, and
    // an empty-state crash is invisible to everyone who already has data.
    for (const path of ["/dashboard/playlists", "/dashboard/library"]) {
      const response = await page.goto(path)

      expect(response?.status(), path).toBeLessThan(400)
      await expect(page, path).toHaveURL(new RegExp(path.replace("/", "\\/")))
      await expect(page.locator("h1, h2").first(), path).toBeVisible()
    }
  })

  test("keeps the session across a reload", async ({ page }, testInfo) => {
    requireAccount(testInfo.project.name)

    await openDashboard(page)
    await page.reload()

    // A session that survives one navigation but not a reload is a cookie
    // written without a max-age, which looks fine in every test that does not
    // reload and strands a real user the moment they refresh.
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test("logs no console errors on the first screen", async ({
    page,
  }, testInfo) => {
    requireAccount(testInfo.project.name)

    const errors: string[] = []

    page.on("console", (message) => {
      if (message.type() !== "error") {
        return
      }

      const text = message.text()

      // Known and pre-existing, documented in the 2026-09-17 handoff §9:
      // Chromium reports this on every page of the site because the CSP is
      // report-only, and fixing it belongs to whoever owns the CSP.
      if (/upgrade-insecure-requests/i.test(text)) {
        return
      }

      errors.push(text)
    })

    await openDashboard(page)
    await page.waitForLoadState("networkidle")

    expect(errors, errors.join("\n")).toEqual([])
  })
})
