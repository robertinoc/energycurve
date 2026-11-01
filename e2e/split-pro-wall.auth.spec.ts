import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

import { asRekordboxXml, syntheticPlaylist } from "../tests/fixtures/playlists"
import { accountFor, skipReason, type TestPlan } from "./helpers/accounts"

/**
 * Splitting a long list into sets is PRO (docs/conversion-plan.md, step 2.2),
 * and FREE must see it as a sales wall, not as an absence: the measurement and
 * the options this list would have, with the PRO badge and a way to the plans.
 *
 * Nothing is submitted. The action's own refusal is covered in
 * tests/split-import.test.ts; this is about what each plan sees, on a phone.
 */
function planOf(projectName: string): TestPlan {
  const match = /^auth-(free|pro|proPlus)$/.exec(projectName)
  expect(match).not.toBeNull()
  const plan = match![1] as TestPlan
  test.skip(accountFor(plan) === null, skipReason(plan))
  return plan
}

// 30 tracks of about six minutes: clearly past an hour, so the form asks.
const longList = asRekordboxXml(syntheticPlaylist({ length: 30 }))

test("a list past an hour: FREE sees the split as PRO, PRO can choose it", async ({ page }, testInfo) => {
  const plan = planOf(testInfo.project.name)

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/dashboard/playlists")
  await page.waitForLoadState("networkidle")

  const input = page.locator("#import-file")
  const form = page.locator("form").filter({ has: input })

  await input.setInputFiles({
    name: "long.xml",
    mimeType: "text/xml",
    buffer: Buffer.from(longList, "utf8"),
  })

  await expect(form).toContainText(/This list plays about/, { timeout: 10_000 })
  await expect(form).toContainText(/Split it into sets of about an hour\?/)

  const choice = form.getByRole("radiogroup", { name: /Split it into sets/ })

  if (plan === "free") {
    await expect(choice).toHaveCount(0)
    await expect(form.locator('input[name="splitCount"]')).toHaveCount(0)
    await expect(form).toContainText(/With PRO, this list is split into sets/)
    await expect(form.getByRole("link", { name: "See plans" })).toHaveAttribute("href", "/pricing")

    // The wall is new surface on a dark raised card, where a dimmed token has
    // failed contrast before: checked on its own, against WCAG AA.
    const { violations } = await new AxeBuilder({ page })
      .include('[aria-labelledby="split-locked-title"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze()
    expect(violations.map((violation) => violation.id)).toEqual([])
  } else {
    await expect(choice).toBeVisible()
    await expect(form).not.toContainText(/With PRO, this list is split/)
  }

  // Phone width, no sideways scroll.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  expect(overflow).toBeLessThanOrEqual(0)
})
