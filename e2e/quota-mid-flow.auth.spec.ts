import { expect, test } from "@playwright/test"

import { currentPeriodStart } from "../lib/product/usage"
import { asCsv, syntheticPlaylist } from "../tests/fixtures/playlists"
import { accountFor, skipReason } from "./helpers/accounts"
import { registryFor } from "./helpers/cleanup"
import { DEV_DB_SKIP_REASON, devDb, devDbConfigured, profileIdFor } from "./helpers/dev-db"
import { importPlaylist } from "./helpers/import-playlist"

/**
 * Banco UX.5: the FREE quota runs out in the middle of a flow.
 *
 * FREE gets one AI ordering a month (`aiOrderingsPerMonth: 1`). The row asks
 * for two things — that the product says so *before* spending, and that it
 * offers the way to PRO without losing what the DJ already did — and the two
 * live in different places:
 *
 * - **Before** is the page: with the allowance spent, the Smart ordering
 *   button is disabled and the note beside it links to /pricing.
 * - **During** is the race the page cannot see: it rendered with one left, the
 *   DJ moved a track by hand, and the allowance went somewhere else (another
 *   tab, a stale page) before the click. The server refuses with a 402 before
 *   any Claude call, and the workbench has its own sentence for it.
 *
 * Spending the allowance through the interface would need a funded Anthropic
 * account (the dev key currently falls back to the heuristic, which is not
 * charged), so it is written into `feature_usage` through the service role —
 * the gate reads the counter, not how it got there. Whatever row was there
 * before is put back at the end, so the account's real month is untouched.
 */

const free = accountFor("free")
const CAPABILITY = "ai_ordering"

test("UX.5 · the AI quota spent mid-flow is refused before Claude, and the hand-made order survives", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "auth-free", "Runs once, as the FREE account.")
  test.skip(!free, skipReason("free"))
  test.skip(!devDbConfigured(), DEV_DB_SKIP_REASON)

  const created = registryFor("free", free!.email)
  const profileId = await profileIdFor(free!.email)
  const period = currentPeriodStart()

  const usageRow = () =>
    devDb()
      .from("feature_usage")
      .select("used")
      .eq("profile_id", profileId)
      .eq("capability", CAPABILITY)
      .eq("period_start", period)
      .maybeSingle()

  const setUsed = async (used: number) => {
    const { error } = await devDb()
      .from("feature_usage")
      .upsert(
        { profile_id: profileId, capability: CAPABILITY, period_start: period, used },
        { onConflict: "profile_id,capability,period_start" }
      )

    if (error) throw new Error(`Writing feature_usage: ${error.message}`)
  }

  const { data: before, error: readError } = await usageRow()
  if (readError) throw new Error(`Reading feature_usage: ${readError.message}`)

  try {
    // One left when the page renders, so the button is live.
    await setUsed(0)

    const url = await importPlaylist(
      page,
      {
        name: "ux5-quota.csv",
        mimeType: "text/csv",
        contents: asCsv(syntheticPlaylist({ length: 10 })),
      },
      created
    )

    await page.goto(`${new URL(url).pathname}/analysis`)
    await page.waitForLoadState("networkidle")

    const smart = page.getByRole("button", { name: /Smart ordering|Ordenación inteligente/ })
    await expect(smart, "with one ordering left, the button is offered").toBeEnabled()
    await expect(
      page.locator("#smart-order-quota"),
      "the allowance is stated before the click"
    ).toHaveText(/1 of 1 AI orderings left|Te queda 1 de 1/)

    // The work the DJ would lose: one track moved by hand.
    const rows = page.locator("li[draggable]")
    await expect(rows).toHaveCount(10)
    await rows.nth(0).dragTo(rows.nth(3))
    const movedByHand = page.getByText(/1 moved by hand|1 movidos a mano/)
    await expect(movedByHand, "the hand move registered").toBeVisible()
    const orderBefore = await rows.allInnerTexts()

    // Spent somewhere else while this page was open.
    await setUsed(1)

    const refused = page.waitForResponse(
      (response) => response.url().includes("/smart-order") && response.request().method() === "POST"
    )
    await smart.click()
    expect((await refused).status(), "the server refuses on the allowance, not on a failure").toBe(402)

    await expect(
      page.getByText(
        /This month's AI orderings are used up|Los ordenamientos con IA de este mes ya se usaron/
      ),
      "the refusal has its own sentence, not the generic error"
    ).toBeVisible()
    await expect(movedByHand, "the hand move is still in effect").toBeVisible()
    expect(await rows.allInnerTexts(), "the order on screen did not change").toEqual(orderBefore)

    const { data: after } = await usageRow()
    expect(after?.used, "a refused request did not spend anything").toBe(1)

    // And the page, rendered now, says it before anyone clicks.
    await page.reload()
    await page.waitForLoadState("networkidle")
    await expect(smart, "with nothing left, the button is not offered").toBeDisabled()
    const note = page.locator("#smart-order-quota")
    await expect(note).toHaveText(/You've used this month's AI ordering|Ya usaste el ordenamiento con IA/)
    await expect(
      note.getByRole("link", { name: /More on PRO|Más en PRO/ }),
      "the way to more is offered where the refusal is"
    ).toHaveAttribute("href", "/pricing")
  } finally {
    // Put the month back the way it was: no row stays no row.
    if (before) {
      await setUsed(before.used as number)
    } else {
      const { error } = await devDb()
        .from("feature_usage")
        .delete()
        .eq("profile_id", profileId)
        .eq("capability", CAPABILITY)
        .eq("period_start", period)

      if (error) throw new Error(`Restoring feature_usage: ${error.message}`)
    }

    await created.deleteAll()
  }
})
