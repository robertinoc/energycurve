import { expect, test } from "@playwright/test"

import { accountFor, skipReason, type TestPlan } from "./helpers/accounts"

/**
 * The first test on the other side of the login wall.
 *
 * It asserts almost nothing about the product on purpose. Its job is to prove
 * the chain works end to end — the setup project signed in, the session was
 * serialised, the `auth-*` project loaded it, and the app accepted it — so that
 * when the real flows land (import → analyse → fix → export) a failure points
 * at the flow rather than at the harness underneath it.
 *
 * A suite whose first authenticated spec is also its most complicated one
 * cannot tell those two apart, and the whole 2026-09 audit turns on that
 * distinction: twice, a test passed while the defect sat in the instrument.
 */

/** Which plan this project is signed in as, read from the project name. */
function planFor(projectName: string): TestPlan | null {
  const match = /^auth-(free|pro|proPlus)$/.exec(projectName)

  return match ? (match[1] as TestPlan) : null
}

test.describe("a signed-in session", () => {
  test("reaches the dashboard instead of the login wall", async ({
    page,
  }, testInfo) => {
    const plan = planFor(testInfo.project.name)

    expect(
      plan,
      `${testInfo.project.name} is not one of the auth-* projects`
    ).not.toBeNull()

    test.skip(accountFor(plan!) === null, skipReason(plan!))

    await page.goto("/dashboard")

    // The public suite already proves that a signed-out visitor is bounced to
    // /login. This is the same claim from the other side, and it is the whole
    // point of the fixture: if the session did not survive serialisation, this
    // is where it shows, once, rather than in every flow that follows.
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator("h1").first()).toBeVisible()
  })
})
