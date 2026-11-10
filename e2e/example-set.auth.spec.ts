import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

import { accountFor, skipReason } from "./helpers/accounts"
import {
  DEV_DB_SKIP_REASON,
  devDbConfigured,
  ownedPlaylistCount,
  profileIdFor,
} from "./helpers/dev-db"

/**
 * Step 1.1 of docs/conversion-plan.md: the example set, as an account with no
 * playlists sees it, at phone width.
 *
 * The FREE test account stands in for a new one: it starts with no playlists
 * (free-plan-cap.auth.spec.ts asserts that), which is the only condition the
 * example depends on. A literally new account is not created here.
 *
 * What it must do: open in one click from the first step, say at every level
 * that it is an example, show the engine's read (score, curve, problems), fit a
 * phone without pushing the page sideways, save nothing, and end on the import.
 *
 * Not here: the two analytics events. In this build no PostHog event leaves the
 * browser at all — not even the app's own $pageview — partly because the CSP
 * only allows the production host and partly for a reason not found on
 * 10/11/2026; with nothing ever sent, a "declined sends nothing" test passes
 * whatever the code does. The consent gate is covered in
 * tests/example-set-preview.test.ts instead.
 */

const free = accountFor("free")

test("MUESTRA.1 · an account with nothing imported opens the example set, and it ends on the import", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "auth-free", "Runs once, as the FREE account with no playlists.")
  test.skip(!free, skipReason("free"))
  test.skip(!devDbConfigured(), DEV_DB_SKIP_REASON)

  const ownerId = await profileIdFor(free!.email)
  expect(await ownedPlaylistCount(ownerId), "the account has nothing imported").toBe(0)

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/dashboard")
  // The dashboard refreshes itself once after load, and for that instant React
  // holds the old tree and the new one in the document — two copies of the
  // example, one hidden (the same thing import-arriving.auth.spec.ts notes).
  // Settled, there is exactly one.
  await page.waitForLoadState("networkidle")

  const example = page.locator("[data-example-set]")
  await expect(example).toHaveCount(1)
  const open = example.locator("summary")
  await expect(open).toBeVisible()
  await expect(open).toHaveText(/See an example set first|Mirá primero un set de ejemplo/)

  // The whole invitation fits: a cut-off summary passed the page-overflow check
  // once, because the card clips what spills out of it.
  const summaryBox = await open.boundingBox()
  const cardBox = await page.locator("section").filter({ has: example }).first().boundingBox()
  expect(summaryBox!.x + summaryBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width)

  await open.click()

  await expect(example).toContainText(/An example set — not yours|Un set de ejemplo, no es tuyo/)
  await expect(example).toContainText(/isn't saved to your account|No se guarda en tu cuenta/)
  await expect(example.locator("[data-example-score]")).toHaveText(/^\d+\.\d$/)
  await expect(example.locator("svg").first()).toBeVisible()
  await expect(example.locator("li").first()).toBeVisible()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  expect(overflow, "the example's curve does not push the page sideways").toBeLessThanOrEqual(0)

  const { violations } = await new AxeBuilder({ page })
    .include("[data-example-set]")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()
  expect(violations.map((violation) => violation.id)).toEqual([])

  // It ends on the import form, on this same page.
  await example.getByRole("link", { name: /Now try it with yours|Ahora probá con lo tuyo/ }).click()
  await expect(page).toHaveURL(/\/dashboard#import$/)
  await expect(page.locator("#import-file")).toBeAttached()
  await expect(page.locator("#import")).toBeInViewport()

  // Read-only: opening and reading it created nothing.
  expect(await ownedPlaylistCount(ownerId), "the example saved nothing to the account").toBe(0)
})
