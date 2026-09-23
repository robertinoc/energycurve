import { expect, test, type Page } from "@playwright/test"

import { exportFilename, type ExportFormat } from "../lib/playlists/export"
import { asTraktorNml, syntheticPlaylist } from "../tests/fixtures/playlists"
import { accountFor, skipReason, type TestPlan } from "./helpers/accounts"

/**
 * F3 — getting the corrected order back out, in all five formats.
 *
 * This is the second half of the product loop and the half that costs money to
 * get wrong. Native export is free on every tier by policy, precisely because
 * analyse → fix → *get it back into the booth* is the loop, and paywalling the
 * last step makes the first two pointless.
 *
 * ## Two things are asserted, and the second one is the point
 *
 * The content, and **the filename**. The filename is not decoration: PR #248
 * fixed a badge that produced `…-optimized-with-energycurve.app.csv`, where a
 * dot before the real extension invites a file manager to read `.app` as the
 * type and hand a DJ's set to the wrong program. It fails silently, which is
 * why a test that only opened the file would never have found it.
 *
 * The expected name comes from `exportFilename` rather than being spelled out
 * here. Spelling it out would mean this spec agrees with itself while
 * disagreeing with the app; reading the same function the download handler
 * reads means the assertion is about the round trip, and the *shape* rule — one
 * dot, at the real extension — is pinned separately in `tests/export.test.ts`.
 */

function requireAccount(projectName: string): TestPlan {
  const match = /^auth-(free|pro|proPlus)$/.exec(projectName)

  expect(match, `${projectName} is not one of the auth-* projects`).not.toBeNull()

  const plan = match![1] as TestPlan

  test.skip(accountFor(plan) === null, skipReason(plan))

  return plan
}

/** Every format the export menu offers, with what the file has to look like. */
const EXPORTS: {
  format: ExportFormat
  /** The label on the menu row, in English. */
  label: RegExp
  /** A string the file must contain, chosen to be format-defining. */
  signature: RegExp
}[] = [
  { format: "rekordbox", label: /for rekordbox/i, signature: /<DJ_PLAYLISTS/i },
  { format: "traktor", label: /for traktor/i, signature: /<NML/i },
  { format: "m3u8", label: /for music apps/i, signature: /#EXTM3U/ },
  { format: "csv", label: /csv file/i, signature: /,|;/ },
  { format: "txt", label: /text file/i, signature: /\S/ },
]

/** Imports one NML set and returns the playlist URL it lands on. */
async function importSet(page: Page, name: string) {
  const tracks = syntheticPlaylist({ length: 10 })

  await page.goto("/dashboard/playlists")
  await page.locator('input[type="file"]').first().setInputFiles({
    name: `${name}.nml`,
    mimeType: "text/xml",
    buffer: Buffer.from(asTraktorNml(tracks), "utf8"),
  })
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(/\/dashboard\/playlists\//, { timeout: 30_000 })

  return tracks
}

test.describe("exporting a set", () => {
  for (const item of EXPORTS) {
    test(`downloads ${item.format} with the right name and content`, async ({
      page,
    }, testInfo) => {
      requireAccount(testInfo.project.name)

      await importSet(page, "export-fixture")

      // The playlist's name as the app stored it, which is what the filename is
      // built from. Read off the page rather than assumed: the import may
      // normalise it, and asserting against my own guess would test my guess.
      const heading = await page.locator("h1").first().innerText()

      await page.getByRole("button", { name: /export/i }).first().click()

      const download = page.waitForEvent("download", { timeout: 20_000 })

      await page.getByRole("button", { name: item.label }).first().click()

      const file = await download

      // The filename, in full. `exportFilename` is the app's own answer, so a
      // mismatch means the download path and the naming function disagree —
      // which is a real class of bug and not a tautology, because the download
      // handler could be passing the wrong playlist or the wrong format.
      expect(file.suggestedFilename()).toBe(
        exportFilename(item.format, heading.trim())
      )

      // And the guarantee PR #248 was about, asserted on the real download
      // rather than on a unit's return value: exactly one dot.
      expect(
        file.suggestedFilename().split(".").length - 1,
        file.suggestedFilename()
      ).toBe(1)

      const stream = await file.createReadStream()
      const chunks: Buffer[] = []

      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk))
      }

      const content = Buffer.concat(chunks).toString("utf8")

      expect(content.length, `${item.format} exported an empty file`)
        .toBeGreaterThan(0)
      expect(content, item.format).toMatch(item.signature)
    })
  }

  test("hands back the library entries it was given, untouched", async ({
    page,
  }, testInfo) => {
    requireAccount(testInfo.project.name)

    await importSet(page, "preservation-fixture")

    await page.getByRole("button", { name: /export/i }).first().click()

    const download = page.waitForEvent("download", { timeout: 20_000 })

    await page.getByRole("button", { name: /for traktor/i }).first().click()

    const file = await download
    const stream = await file.createReadStream()
    const chunks: Buffer[] = []

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }

    const content = Buffer.concat(chunks).toString("utf8")

    // The P0 of 2026-09-07, from the outside. The writer rebuilt each entry
    // from the eleven fields this codebase models, and a real Traktor entry
    // carries twenty-five — so hotcues, loops and the analysis fingerprint were
    // deleted from a DJ's collection on export.
    //
    // The fixture goes in carrying all three. If any of them is missing here,
    // the round trip dropped it.
    expect(content, "hotcues did not survive the round trip").toMatch(/CUE_V2/)
    expect(content, "the analysis fingerprint did not survive").toMatch(
      /AUDIO_ID/
    )
  })

  test("is available on the free plan", async ({ page }, testInfo) => {
    const plan = requireAccount(testInfo.project.name)

    test.skip(plan !== "free", "this asserts the free tier specifically")

    await importSet(page, "free-tier-fixture")

    // Policy, not a nicety: `AGENTS.md` and `tests/pricing-copy.test.ts` both
    // say native export is free forever on every tier, because paywalling the
    // last step of the loop makes the first two pointless. This is the same
    // claim asserted where a user would meet it.
    const button = page.getByRole("button", { name: /export/i }).first()

    await expect(button).toBeVisible()
    await expect(button).toBeEnabled()
  })
})
