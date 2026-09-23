import { expect, test, type Page } from "@playwright/test"

import {
  asCsv,
  asM3u8,
  asRekordboxXml,
  asTraktorNml,
  syntheticPlaylist,
} from "../tests/fixtures/playlists"
import { accountFor, skipReason, type TestPlan } from "./helpers/accounts"

/**
 * F3 — bring a set in, see its curve.
 *
 * ## The fixtures are generated, not checked in
 *
 * `tests/fixtures/playlists.ts` already builds all four formats, and this spec
 * uses it rather than adding files to the repo. Two reasons, both borrowed from
 * that file's own note: a checked-in fixture drifts from the parser it is meant
 * to exercise and nobody notices when it stops covering anything, and nobody's
 * real crate ends up in a git history.
 *
 * The NML in particular carries `CUE_V2`, `AUDIO_ID` and `INFO` fields, which
 * is what makes it the right file for this — the P0 bug of 2026-09-07 was an
 * export that rebuilt entries from eleven fields when a real one carries
 * twenty-five, and silently deleted hotcues and loops.
 *
 * ## Why these skip without credentials
 *
 * Same rule as the rest of the authenticated suite: a missing account skips
 * with a stated reason. It never fails, because that trains everyone to ignore
 * a red CI, and it never passes, because a green tick over a test that did not
 * run is the worst of the three.
 */

function requireAccount(projectName: string): TestPlan {
  const match = /^auth-(free|pro|proPlus)$/.exec(projectName)

  expect(match, `${projectName} is not one of the auth-* projects`).not.toBeNull()

  const plan = match![1] as TestPlan

  test.skip(accountFor(plan) === null, skipReason(plan))

  return plan
}

/** The four export formats, each built from the same ten synthetic tracks. */
const FORMATS = [
  {
    name: "Rekordbox XML",
    file: "synthetic.xml",
    mime: "text/xml",
    build: asRekordboxXml,
  },
  {
    name: "Traktor NML",
    file: "synthetic.nml",
    mime: "text/xml",
    build: asTraktorNml,
  },
  { name: "M3U8", file: "synthetic.m3u8", mime: "audio/x-mpegurl", build: asM3u8 },
  { name: "CSV", file: "synthetic.csv", mime: "text/csv", build: asCsv },
] as const

/**
 * Imports one file and lands on whatever the app navigates to.
 *
 * Returns the URL rather than asserting inside, so a caller can say what it
 * expected — a helper that asserts is a helper whose failures all look the same.
 */
async function importFile(
  page: Page,
  format: (typeof FORMATS)[number],
  tracks: ReturnType<typeof syntheticPlaylist>
): Promise<string> {
  await page.goto("/dashboard/playlists")

  await page.locator('input[type="file"]').first().setInputFiles({
    name: format.file,
    mimeType: format.mime,
    buffer: Buffer.from(format.build(tracks), "utf8"),
  })

  // Context is required and defaults to `main`; genre defaults to auto-detect.
  // Both are left at their defaults on purpose — this asserts the import path,
  // and a spec that also drives two selects fails for two reasons at once.
  await page.locator('button[type="submit"]').first().click()

  await page.waitForURL(/\/dashboard\/playlists\//, { timeout: 30_000 })

  return page.url()
}

test.describe("importing a set", () => {
  for (const format of FORMATS) {
    test(`reads ${format.name} and shows the tracks`, async ({
      page,
    }, testInfo) => {
      requireAccount(testInfo.project.name)

      const tracks = syntheticPlaylist({ length: 10 })

      await importFile(page, format, tracks)

      // The first and last track by name. Asserting a count would pass on a
      // parser that produced ten rows of the wrong thing, which is the failure
      // an import test exists to catch.
      await expect(page.getByText(tracks[0].name, { exact: false }).first())
        .toBeVisible()
      await expect(
        page.getByText(tracks[tracks.length - 1].name, { exact: false }).first()
      ).toBeVisible()
    })
  }

  test("draws a curve for the imported set", async ({ page }, testInfo) => {
    requireAccount(testInfo.project.name)

    await importFile(page, FORMATS[1], syntheticPlaylist({ length: 10 }))

    // An SVG, because the curve is drawn rather than written. Asserting it is
    // attached and has a path in it: an empty `<svg>` renders without error and
    // is exactly what a set with no readable energy produces.
    const svg = page.locator("svg").first()

    await expect(svg).toBeVisible()
    await expect(svg.locator("path, polyline").first()).toBeAttached()
  })

  test("says which part of the curve is data and which is a guess", async ({
    page,
  }, testInfo) => {
    requireAccount(testInfo.project.name)

    // Half the set untagged: the product's central rule is that it states what
    // it does not know rather than drawing one confident line through both.
    const tracks = syntheticPlaylist({
      length: 10,
      missingBpm: 5,
      missingKey: 5,
    })

    await importFile(page, FORMATS[0], tracks)

    const body = await page.locator("body").innerText()

    // Not an exact sentence — that is copy, in two languages. What must be true
    // is that the page says *something* about the gap rather than presenting a
    // score as if all ten tracks had been measured.
    expect(
      /estimat|guess|missing|without|sin |estimac|falta/i.test(body),
      "a half-untagged set is presented as if it were fully measured"
    ).toBe(true)
  })

  test("keeps the set reachable after a reload", async ({ page }, testInfo) => {
    requireAccount(testInfo.project.name)

    const tracks = syntheticPlaylist({ length: 10 })
    const url = await importFile(page, FORMATS[3], tracks)

    await page.goto(url)

    // The import is only real once it has survived a round trip through the
    // database. An in-memory success that vanishes on reload is precisely the
    // 0021 failure mode — the write never landed and nothing said so.
    await expect(page.getByText(tracks[0].name, { exact: false }).first())
      .toBeVisible()
  })

  test("offers a comparison between two saved versions", async ({
    page,
  }, testInfo) => {
    requireAccount(testInfo.project.name)

    const url = await importFile(page, FORMATS[1], syntheticPlaylist({ length: 10 }))
    const compare = `${url.replace(/\/$/, "")}/compare`

    const response = await page.goto(compare)

    // A freshly imported set has one version, so this asserts the page loads
    // and says so — not that a diff is rendered. A comparison view that throws
    // on a set with nothing to compare is the empty state nobody visits.
    expect(response?.status(), compare).toBeLessThan(400)
    await expect(page.locator("h1, h2").first()).toBeVisible()
  })
})
