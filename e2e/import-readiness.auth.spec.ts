import { expect, test } from "@playwright/test"

import { asRekordboxXml, syntheticPlaylist } from "../tests/fixtures/playlists"
import { accountFor, skipReason, type TestPlan } from "./helpers/accounts"

/**
 * "Ready to import" is earned by the parse, not by the extension.
 *
 * The F1 audit (finding A3) chose three files the product cannot import and
 * got "Ready to import" for each: readiness was granted by the file having a
 * name. The person found out on submit, or found out nothing — a valid export
 * with zero tracks saved an empty playlist.
 *
 * The four files here are the audit's three plus the one that must keep
 * working: a playlist with no BPM and no key. The product exists for those
 * sets, so a check that refused them would be a regression dressed as
 * validation. Nothing is submitted for the bad three — the property under test
 * is what the form says *before* anyone presses Import.
 *
 * Runs on the FREE account only. It is about the form, not the plan, and the
 * import control is the same on all three.
 */
function planOf(projectName: string): TestPlan {
  const match = /^auth-(free|pro|proPlus)$/.exec(projectName)
  expect(match).not.toBeNull()
  const plan = match![1] as TestPlan
  test.skip(accountFor(plan) === null, skipReason(plan))
  test.skip(plan !== "free", "The import form is the same on every plan; once is enough.")
  return plan
}

const whole = asRekordboxXml(syntheticPlaylist({ length: 8 }))

const CASES: {
  label: string
  file: { name: string; mimeType: string; contents: string }
  ready: boolean
  says: RegExp
}[] = [
  {
    label: "a Rekordbox XML cut off halfway",
    file: { name: "cut.xml", mimeType: "text/xml", contents: whole.slice(0, Math.floor(whole.length / 2)) },
    ready: false,
    says: /cut off or damaged/,
  },
  {
    label: "a valid export with zero tracks",
    file: { name: "empty.xml", mimeType: "text/xml", contents: asRekordboxXml([]) },
    ready: false,
    says: /has no tracks in it/,
  },
  {
    label: "a text file that is not a playlist",
    file: { name: "notes.txt", mimeType: "text/plain", contents: "milk\nbread\n" },
    ready: false,
    says: /doesn't look like a playlist/,
  },
  {
    label: "a playlist with no BPM and no key (control)",
    file: {
      name: "untagged.xml",
      mimeType: "text/xml",
      contents: asRekordboxXml(syntheticPlaylist({ length: 6, missingBpm: 6, missingKey: 6 })),
    },
    ready: true,
    says: /Ready to import · 6 tracks/,
  },
]

for (const { label, file, ready, says } of CASES) {
  test(`the import form, given ${label}`, async ({ page }, testInfo) => {
    planOf(testInfo.project.name)

    await page.goto("/dashboard/playlists")
    await page.waitForLoadState("networkidle")

    const input = page.locator("#import-file")
    const form = page.locator("form").filter({ has: input })
    await expect(input).toHaveCount(1)

    await input.setInputFiles({
      name: file.name,
      mimeType: file.mimeType,
      buffer: Buffer.from(file.contents, "utf8"),
    })

    // The verdict is what the form says once it has read the file.
    await expect(form).toContainText(says, { timeout: 10_000 })

    const submit = form.locator('button[type="submit"]')

    if (ready) {
      await expect(submit).toBeEnabled()
    } else {
      await expect(form).not.toContainText(/Ready to import/)
      await expect(submit).toBeDisabled()
    }
  })
}
