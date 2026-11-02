import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { CURRENT_ANALYSIS_ALGORITHM_VERSION } from "../lib/product/strategy"
import { currentPeriodStart } from "../lib/product/usage"
import { accountFor, skipReason } from "./helpers/accounts"
import { DEV_DB_SKIP_REASON, devDb, devDbConfigured, profileIdFor } from "./helpers/dev-db"

/**
 * Walls 2 and 3 of step 3.1 (docs/conversion-plan.md), as the FREE account at
 * phone width. Wall 1, the fourth playlist, lives in free-plan-cap.auth.spec.ts
 * (AUD.4), which already drives a real fourth import.
 *
 * The state each wall needs — a month's AI ordering spent, an earlier analysis
 * to beat — goes in through the service role, and comes back out in `finally`,
 * so the FREE account ends as it started. The page is what's under test.
 */

const free = accountFor("free")

function freeOnly(projectName: string) {
  test.skip(projectName !== "auth-free", "The walls are what FREE sees; runs once, as FREE.")
  test.skip(!free, skipReason("free"))
  test.skip(!devDbConfigured(), DEV_DB_SKIP_REASON)
}

/** An analysable set of the FREE account's: house, main time, eight tracks. */
async function seedSet(ownerId: string, name: string, energies: number[]): Promise<string> {
  const { data: playlist, error } = await devDb()
    .from("playlists")
    .insert({ user_id: ownerId, name, genre: "house", context: "main" })
    .select("id")
    .single()

  if (error) throw new Error(`Seeding ${name}: ${error.message}`)

  const { error: tracksError } = await devDb()
    .from("tracks")
    .insert(
      energies.map((energy, index) => ({
        playlist_id: playlist.id,
        position: index + 1,
        artist: `Wall Artist ${index + 1}`,
        name: `Wall Track ${index + 1}`,
        bpm: 124,
        energy_score: energy,
      }))
    )

  if (tracksError) throw new Error(`Seeding ${name}'s tracks: ${tracksError.message}`)

  return playlist.id as string
}

async function expectWallFits(page: Page, wall: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  expect(overflow, "the wall does not push the page sideways").toBeLessThanOrEqual(0)

  const { violations } = await new AxeBuilder({ page })
    .include(`[data-sales-wall="${wall}"]`)
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()
  expect(violations.map((violation) => violation.id)).toEqual([])
}

test("MUROS.2 · the month's AI ordering spent: the button is off and the PRO wall says what PRO gives", async ({
  page,
}, testInfo) => {
  freeOnly(testInfo.project.name)

  const ownerId = await profileIdFor(free!.email)
  const period = currentPeriodStart()
  const usage = () =>
    devDb()
      .from("feature_usage")
      .select("used")
      .eq("profile_id", ownerId)
      .eq("capability", "ai_ordering")
      .eq("period_start", period)
      .maybeSingle()
  const before = (await usage()).data?.used ?? null
  const playlistId = await seedSet(ownerId, `MUROS.2 ${Date.now()}`, [3, 5, 4, 7, 6, 8, 9, 5])

  try {
    const { error } = await devDb()
      .from("feature_usage")
      .upsert(
        { profile_id: ownerId, capability: "ai_ordering", period_start: period, used: 1 },
        { onConflict: "profile_id,capability,period_start" }
      )
    if (error) throw new Error(`Spending the month's ordering: ${error.message}`)

    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/dashboard/playlists/${playlistId}/analysis`)

    const wall = page.locator('[data-sales-wall="ai_ordering_limit"]')
    await expect(wall).toBeVisible({ timeout: 20_000 })
    await expect(wall).toContainText(/PRO gives you 3 AI orderings a month|Con PRO son 3 ordenamientos con IA por mes/)
    await expect(page.getByRole("button", { name: /Smart ordering|Ordenación inteligente/ })).toBeDisabled()
    await expect(wall.getByRole("link", { name: /See plans|Ver planes/ })).toHaveAttribute(
      "href",
      /^\/api\/sales-wall\?wall=ai_ordering_limit&locale=(en|es)$/
    )

    await expectWallFits(page, "ai_ordering_limit")
  } finally {
    await devDb().from("playlists").delete().eq("id", playlistId)
    if (before === null) {
      await devDb()
        .from("feature_usage")
        .delete()
        .eq("profile_id", ownerId)
        .eq("capability", "ai_ordering")
        .eq("period_start", period)
    } else {
      await devDb()
        .from("feature_usage")
        .update({ used: before })
        .eq("profile_id", ownerId)
        .eq("capability", "ai_ordering")
        .eq("period_start", period)
    }
  }
})

/**
 * An earlier analysis of the set, in another order, with this score. Same
 * genre, context and algorithm version as the page will compute, so the only
 * thing that changed is the set — the one case wall 3 is for.
 */
async function seedEarlierAnalysis(ownerId: string, playlistId: string, setScore: number) {
  const { error } = await devDb()
    .from("analyses")
    .insert({
      playlist_id: playlistId,
      user_id: ownerId,
      genre: "house",
      context: "main",
      set_score: setScore,
      curve: [9, 3, 8, 4, 7, 5, 6, 5],
      issues: [],
      breakdown: {},
      input_hash: `muros-3-earlier-${Date.now()}`,
      algorithm_version: CURRENT_ANALYSIS_ALGORITHM_VERSION,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    })

  if (error) throw new Error(`Seeding the earlier analysis: ${error.message}`)
}

test("MUROS.3 · a re-analysis that raised the score: a strip under it, not over it", async ({
  page,
}, testInfo) => {
  freeOnly(testInfo.project.name)

  const ownerId = await profileIdFor(free!.email)
  const playlistId = await seedSet(ownerId, `MUROS.3 ${Date.now()}`, [3, 5, 4, 7, 6, 8, 9, 5])

  try {
    await seedEarlierAnalysis(ownerId, playlistId, 1.0)

    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/dashboard/playlists/${playlistId}/analysis`)

    const strip = page.locator('[data-sales-wall="score_improved"]')
    await expect(strip).toBeVisible({ timeout: 20_000 })
    await expect(strip).toContainText(/You raised the score from 1\.0 to \d+\.\d|Subiste el score de 1\.0 a \d+\.\d/)
    await expect(strip).toContainText(/PRO/)
    await expect(strip.getByRole("link", { name: /See plans|Ver planes/ })).toHaveAttribute(
      "href",
      /^\/api\/sales-wall\?wall=score_improved&locale=(en|es)$/
    )
    // Not a modal: nothing is covering the page.
    await expect(page.getByRole("dialog")).toHaveCount(0)

    await expectWallFits(page, "score_improved")
  } finally {
    // Cascades to the analyses, the seeded one and the one this visit recorded.
    await devDb().from("playlists").delete().eq("id", playlistId)
  }
})

test("MUROS.3 · a re-analysis that lowered the score shows nothing", async ({ page }, testInfo) => {
  freeOnly(testInfo.project.name)

  const ownerId = await profileIdFor(free!.email)
  const playlistId = await seedSet(ownerId, `MUROS.3 lower ${Date.now()}`, [3, 5, 4, 7, 6, 8, 9, 5])

  try {
    await seedEarlierAnalysis(ownerId, playlistId, 10.0)

    await page.goto(`/dashboard/playlists/${playlistId}/analysis`)
    await expect(page.getByText(/Score now|Score ahora/i).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('[data-sales-wall="score_improved"]')).toHaveCount(0)
  } finally {
    await devDb().from("playlists").delete().eq("id", playlistId)
  }
})
