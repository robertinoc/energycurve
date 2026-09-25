import { expect, test, type Page } from "@playwright/test"

import {
  asCsv,
  asM3u8,
  asRekordboxXml,
  asTraktorNml,
  syntheticPlaylist,
} from "../tests/fixtures/playlists"
import { accountFor, skipReason, type TestPlan } from "./helpers/accounts"
import { registryFor } from "./helpers/cleanup"
import { importPlaylist } from "./helpers/import-playlist"

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

/**
 * Sequential within this file, against the config's `fullyParallel: true`.
 *
 * That setting carries the note "nothing here mutates shared state, so parallel
 * is safe", which was true when every spec was a signed-out page read and
 * stopped being true the moment the authenticated suites landed: all the tests
 * in this file import playlists **into the same account**, so they are reading
 * and writing one list. Run in parallel they raced each other — a locator that
 * was unambiguous when it was asserted had a second match by the time it was
 * used, and the failure surfaced as an intermittent strict-mode violation
 * rather than as the contention it was.
 */
test.describe.configure({ mode: "default" })

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
 * What each project created, deleted after **every** test.
 *
 * Per-test because the FREE plan allows three active playlists
 * (`PLAN_LIMITS.free`) and this file imports more than three: cleaning up at
 * the end meant the fourth import onwards was correctly refused by the product
 * while the spec sat waiting for a navigation that was never coming.
 *
 * Per-plan because the same file runs once per `auth-*` project against a
 * different account, and one shared registry would have PRO deleting FREE's
 * sets. The plan is read from `test.info()` rather than threaded through every
 * call, which keeps the signature of the import helpers about importing.
 */
function registry() {
  const plan = (/^auth-(free|pro|proPlus)$/.exec(test.info().project.name)?.[1] ??
    "free") as TestPlan

  return registryFor(plan, accountFor(plan)?.email ?? "none@example.com")
}

test.afterEach(async () => {
  await registry().deleteAll()
})

async function importFile(
  page: Page,
  format: (typeof FORMATS)[number],
  tracks: ReturnType<typeof syntheticPlaylist>
): Promise<string> {
  return importPlaylist(
    page,
    {
      name: format.file,
      mimeType: format.mime,
      contents: format.build(tracks),
    },
    registry()
  )
}

test.describe("importing a set", () => {
  // An import is an upload, a parse and a database write; an export adds a
  // download. The 30s default belongs to tests that assert on a rendered page,
  // and leaving it here produced timeouts that read like hangs.
  test.setTimeout(90_000)

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
