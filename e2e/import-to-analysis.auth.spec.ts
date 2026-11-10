import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

import { asRekordboxXml, syntheticPlaylist } from "../tests/fixtures/playlists"
import { accountFor, skipReason } from "./helpers/accounts"
import { registryFor } from "./helpers/cleanup"
import { DEV_DB_SKIP_REASON, devDb, devDbConfigured, profileIdFor } from "./helpers/dev-db"
import { importPlaylist } from "./helpers/import-playlist"

/**
 * Step 1.2 of docs/conversion-plan.md — from the import to the analysis, on a
 * phone.
 *
 * In the seven days to 10/11/2026 people created 105 playlists and ran 49
 * analyses. The playlist page offered "Analyze set" as the last of seven equal
 * buttons and the import summary ended in a link to a documentation page. This
 * walks what replaced it, the way a person with a new account does: import a
 * set, read where the page sends them, follow it, and end on the curve.
 *
 * It is one test on purpose. The claim is about a sequence — the page offers
 * one thing before the analysis and another after — and four tests that each
 * imported their own set would say nothing about the order.
 *
 * At phone width throughout: the product is installed as a PWA and the row of
 * actions was the obvious thing to push a 375px screen sideways.
 */

test.describe.configure({ mode: "default" })

const free = accountFor("free")
const proPlus = accountFor("proPlus")
const registry = () => registryFor("free", free?.email ?? null)

test.afterEach(async () => {
  await registry().deleteAll()
})

const PHONE = { width: 375, height: 812 }

/**
 * A playlist page, loaded and settled. The page is streamed, and while React
 * swaps the resolved content in for its fallback both trees are in the
 * document — so for an instant there are two action bars, and a locator that
 * is unique on a settled page is not (the same thing e2e/helpers/import-playlist.ts
 * documents for `#import-file`).
 */
async function openSettled(page: Page, url: string) {
  await page.goto(url)
  await page.waitForLoadState("networkidle")
}

async function expectNoSidewaysScroll(page: Page, where: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )

  expect(overflow, `${where} pushes the page sideways at ${PHONE.width}px`).toBeLessThanOrEqual(0)
}

async function expectAccessible(page: Page, selector: string) {
  const { violations } = await new AxeBuilder({ page })
    .include(selector)
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()

  expect(
    violations.map((violation) => violation.id),
    selector
  ).toEqual([])
}

test("ANALIZAR.E2E · a new account imports a set and the page takes it to the analysis", async ({
  page,
}, testInfo) => {
  // The FREE account is the closest thing the suite has to a new one — no plan
  // and no sets of its own — and analysing is free, so it is the right one to
  // prove that nothing here is behind a plan.
  test.skip(testInfo.project.name !== "auth-free", "Runs once, as the FREE account.")
  test.skip(!free, skipReason("free"))
  test.setTimeout(180_000)

  await page.setViewportSize(PHONE)

  const playlistUrl = (
    await importPlaylist(
      page,
      {
        name: "first-set.xml",
        mimeType: "text/xml",
        contents: asRekordboxXml(syntheticPlaylist({ length: 10 })),
      },
      registry()
    )
  ).split("?")[0]

  // The import's own redirect carries `?imported=1`. It is not reliable — the
  // helper documents runs where the set is created and the browser stays on
  // the list — and that is not this spec's subject, so the arrival is restated
  // when the redirect did not happen.
  if (!page.url().includes("imported=1")) {
    await openSettled(page, `${playlistUrl}?imported=1`)
  } else {
    await page.waitForLoadState("networkidle")
  }

  // ── On arrival: the page leads with the analysis ──────────────────────────
  const bar = page.locator('[data-emphasis="lead"]')
  const headerAnalyze = page.locator('a[data-analyze-placement="header"]')
  const others = bar.getByRole("group")

  await expect(bar).toBeVisible({ timeout: 20_000 })
  await expect(headerAnalyze).toBeVisible()
  await expect(others.getByRole("button", { name: /export/i })).toBeVisible()

  const analyzeBox = (await headerAnalyze.boundingBox())!
  const othersBox = (await others.boundingBox())!

  // First, and the full width of the screen: not one button among seven.
  expect(analyzeBox.y + analyzeBox.height).toBeLessThanOrEqual(othersBox.y)
  expect(analyzeBox.width).toBeGreaterThan(PHONE.width * 0.8)

  // ── The import summary ends in the next step, not in a document ───────────
  const summary = page.getByTestId("import-summary")
  const nextStep = summary.getByTestId("analyze-next-step")

  await expect(summary).toBeVisible()
  await expect(nextStep).toBeVisible()
  await expect(nextStep).toContainText(/curve|curva/)
  await expect(nextStep).toContainText(/jumps|saltos/)
  await expect(summary.locator("a").last()).toHaveAttribute(
    "data-analyze-placement",
    "import_summary"
  )

  await expectNoSidewaysScroll(page, "the playlist page, never analysed")
  await expectAccessible(page, '[data-emphasis="lead"]')
  await expectAccessible(page, '[data-testid="analyze-next-step"]')

  // The other actions stepped back, they did not go away: Export still opens,
  // and its menu stays on the screen.
  await others.getByRole("button", { name: /export/i }).click()
  const menu = page.getByTestId("export-menu")
  await expect(menu).toBeVisible()
  const menuBox = (await menu.boundingBox())!
  expect(menuBox.x, "the export menu starts off the left edge").toBeGreaterThanOrEqual(0)
  expect(menuBox.x + menuBox.width, "the export menu runs off the right edge").toBeLessThanOrEqual(
    PHONE.width
  )

  // ── Said once: a later visit leads the same way, without the note ─────────
  await openSettled(page, playlistUrl)
  await expect(page.locator('[data-emphasis="lead"]')).toBeVisible()
  await expect(page.getByTestId("analyze-next-step")).toHaveCount(0)
  await expect(page.getByTestId("import-summary")).toHaveCount(0)

  // ── Following it ends on the curve ───────────────────────────────────────
  await openSettled(page, `${playlistUrl}?imported=1`)
  await page.getByTestId("import-summary").getByTestId("analyze-next-step").locator("a").click()

  await expect(page).toHaveURL(/\/analysis$/, { timeout: 30_000 })
  await expect(page.locator("main h1")).toBeVisible({ timeout: 30_000 })
  // The curve itself: a drawing with a line in it and the width of a chart.
  // "Any svg with a path" would be satisfied by an icon.
  await expect
    .poll(
      () =>
        page
          .locator("main svg")
          .evaluateAll((nodes) =>
            nodes.some(
              (node) =>
                node.getBoundingClientRect().width > 200 &&
                node.querySelector("path, polyline") !== null
            )
          ),
      { timeout: 30_000, message: "the analysis never drew a curve" }
    )
    .toBe(true)

  // ── After the analysis: the row it always had, and nothing to explain ─────
  // The history row is written after the response (`after()`), so the page is
  // asked again until it has seen it. A wait for a state, not a retry of an
  // assertion.
  await expect
    .poll(
      async () => {
        await openSettled(page, `${playlistUrl}?imported=1`)

        return page.locator('[data-emphasis="peer"]').count()
      },
      { timeout: 30_000, message: "the page never noticed the set had been analysed" }
    )
    .toBe(1)

  await expect(page.locator('[data-emphasis="lead"]')).toHaveCount(0)
  await expect(page.getByTestId("analyze-next-step")).toHaveCount(0)
  // The summary still says what the file carried; it just has no step to add.
  await expect(page.getByTestId("import-summary")).toBeVisible()
  await expect(page.locator('a[data-analyze-placement="header"]')).toBeVisible()
  await expectNoSidewaysScroll(page, "the playlist page, already analysed")
})

test("ANALIZAR.MENU · with every action on the page, the export menu still opens on the screen", async ({
  page,
}, testInfo) => {
  // PRO+ is the account with the most actions in the bar — Share curve and
  // Save shape on top of the rest — so it is where Export lands furthest from
  // the right edge once the row wraps, and where a 288px menu hung from the
  // button's right edge runs off the left of a phone.
  test.skip(testInfo.project.name !== "auth-proPlus", "Runs once, as the PRO+ account.")
  test.skip(!proPlus, skipReason("proPlus"))
  test.skip(!devDbConfigured(), DEV_DB_SKIP_REASON)

  // The set goes in through the service role: what is under test is the page
  // of a set nobody analysed, not the import that made it.
  const ownerId = await profileIdFor(proPlus!.email)
  const { data: playlist, error } = await devDb()
    .from("playlists")
    .insert({
      user_id: ownerId,
      name: `ANALIZAR.MENU ${Date.now()}`,
      genre: "house",
      context: "main",
    })
    .select("id")
    .single()

  if (error) throw new Error(`Seeding the set: ${error.message}`)

  try {
    const { error: tracksError } = await devDb()
      .from("tracks")
      .insert(
        [4, 5, 6, 7, 8, 9, 8, 6].map((energy, index) => ({
          playlist_id: playlist.id,
          position: index + 1,
          artist: `Menu Artist ${index + 1}`,
          name: `Menu Track ${index + 1}`,
          bpm: 124,
          energy_score: energy,
        }))
      )

    if (tracksError) throw new Error(`Seeding the tracks: ${tracksError.message}`)

    await page.setViewportSize(PHONE)
    await openSettled(page, `/dashboard/playlists/${playlist.id}`)

    const others = page.locator('[data-emphasis="lead"]').getByRole("group")
    await expect(others).toBeVisible({ timeout: 20_000 })
    await expectNoSidewaysScroll(page, "the playlist page with every action")

    await others.getByRole("button", { name: /export/i }).click()

    const menu = page.getByTestId("export-menu")
    await expect(menu).toBeVisible()

    const box = (await menu.boundingBox())!
    expect(box.x, "the export menu starts off the left edge").toBeGreaterThanOrEqual(0)
    expect(box.x + box.width, "the export menu runs off the right edge").toBeLessThanOrEqual(
      PHONE.width
    )
    await expectNoSidewaysScroll(page, "the playlist page with the export menu open")
  } finally {
    await devDb().from("playlists").delete().eq("id", playlist.id)
  }
})
