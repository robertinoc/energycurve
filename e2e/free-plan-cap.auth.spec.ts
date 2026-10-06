import { expect, test } from "@playwright/test"

import { asCsv, syntheticPlaylist } from "../tests/fixtures/playlists"
import { accountFor, skipReason } from "./helpers/accounts"
import {
  DEV_DB_SKIP_REASON,
  devDb,
  devDbConfigured,
  ownedPlaylistCount,
  profileIdFor,
} from "./helpers/dev-db"

/**
 * Banco AUD.4: the fourth import on FREE.
 *
 * The authenticated audit of 26/09 left this one "sin confirmar": three
 * imports went in and the page said something at the cap, but nobody saw what
 * a fourth attempt does — refused with a useful message, or broken in some
 * other way. FREE allows three playlists (`PLAN_LIMITS`), and the refusal has
 * its own copy, `playlistLimit`.
 *
 * Getting to the cap through the interface would mean three imports and three
 * cleanups for one question. The three playlists go in through the service
 * role instead — the cap counts rows, not how they arrived — and the fourth is
 * a real import through the form, which is the thing the row is about.
 */

const free = accountFor("free")

test("AUD.4 · a fourth import on FREE is refused, and the refusal says why", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "auth-free", "Runs once, as the FREE account.")
  test.skip(!free, skipReason("free"))
  test.skip(!devDbConfigured(), DEV_DB_SKIP_REASON)

  const ownerId = await profileIdFor(free!.email)
  const before = await ownedPlaylistCount(ownerId)
  expect(before, "the FREE account starts empty, so three makes the cap").toBe(0)

  const { data: filler, error } = await devDb()
    .from("playlists")
    .insert(
      [1, 2, 3].map((n) => ({
        user_id: ownerId,
        name: `AUD.4 cap filler ${n}`,
        genre: "techno",
        context: "main",
      }))
    )
    .select("id")

  if (error) throw new Error(`Filling the FREE cap: ${error.message}`)

  try {
    await page.goto("/dashboard/playlists")
    // Same wait as e2e/helpers/import-playlist.ts: a file set before the form
    // hydrates is never seen by it (seen on the first run of this test).
    await page.waitForLoadState("networkidle")

    const fileInput = page.locator("#import-file")
    const form = page.locator("form").filter({ has: fileInput })
    await expect(fileInput, "the import control is still offered at the cap").toHaveCount(1)

    await fileInput.setInputFiles({
      name: "fourth.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(asCsv(syntheticPlaylist({ length: 6 })), "utf8"),
    })
    await expect(form.getByText("fourth.csv")).toBeVisible()
    await form.locator("#import-genre").click()
    await page.getByRole("option", { name: "Techno", exact: true }).click()
    await form.locator('button[type="submit"]').click()

    await expect(
      page.getByText(
        /You've reached 3 playlists on your plan|Llegaste a 3 playlists en tu plan/
      )
    ).toBeVisible({ timeout: 20_000 })
    expect(await ownedPlaylistCount(ownerId), "no fourth playlist was saved").toBe(3)
  } finally {
    // The fillers, and a fourth one if the cap ever stops holding.
    const { data: owned } = await devDb().from("playlists").select("id").eq("user_id", ownerId)
    const ids = (owned ?? []).map((row) => row.id as string)
    const fillerIds = new Set((filler ?? []).map((row) => row.id as string))
    const stray = ids.filter((id) => !fillerIds.has(id))

    await devDb().from("playlists").delete().in("id", [...fillerIds, ...stray])
    expect(await ownedPlaylistCount(ownerId), "the FREE account is back to empty").toBe(before)
  }
})
