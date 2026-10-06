import { expect, test } from "@playwright/test"

import { accountFor, skipReason } from "./helpers/accounts"
import { DEV_DB_SKIP_REASON, devDb, devDbConfigured, profileIdFor } from "./helpers/dev-db"

/**
 * Banco L16.5 (IMP.1): a playlist opened between its row and its tracks.
 *
 * The import writes the playlist first and the tracks after, so for a moment
 * the set exists with nothing in it. Before lote 16 a page opened in that
 * window rendered an empty table with "Export" disabled and stayed that way
 * until a manual reload. The manual row asked Robertino to import 100+ tracks
 * in one tab and win a race in another, which is why it was never run.
 *
 * The race is not needed: the window is a state, and the state can be written.
 * The playlist row goes in through the service role exactly as the import
 * leaves it (an `import_source`, no tracks, created now), the page is opened,
 * and then the tracks arrive — without the test touching the page again.
 */

test.describe.configure({ mode: "default" })

const pro = accountFor("pro")

test("L16.5 · a playlist whose tracks are still arriving says so, and fills in by itself", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "auth-pro", "Runs once, as the PRO account.")
  test.skip(!pro, skipReason("pro"))
  test.skip(!devDbConfigured(), DEV_DB_SKIP_REASON)

  const ownerId = await profileIdFor(pro!.email)
  const { data: playlist, error } = await devDb()
    .from("playlists")
    .insert({
      user_id: ownerId,
      name: `L16.5 arriving ${Date.now()}`,
      genre: "house",
      context: "main",
      import_source: "rekordbox",
    })
    .select("id")
    .single()

  if (error) throw new Error(`Creating the arriving playlist: ${error.message}`)

  try {
    await page.goto(`/dashboard/playlists/${playlist.id}`)

    // `.first()`: the page refreshes itself every second while it waits, and
    // for the instant a refresh streams in the old tree and the new one are
    // both in the document — two identical headings. Seen once in three full
    // runs as a strict-mode violation; the message being on screen is the
    // assertion, not how many copies of it React holds for a frame.
    await expect(
      page.getByText(/Still bringing your tracks in|Todavía estamos trayendo tus temas/).first()
    ).toBeVisible()

    const { error: tracksError } = await devDb()
      .from("tracks")
      .insert(
        [1, 2, 3].map((position) => ({
          playlist_id: playlist.id,
          position,
          artist: "Arriving Artist",
          name: `Arriving Track ${position}`,
          bpm: 124,
          musical_key: "8A",
        }))
      )

    if (tracksError) throw new Error(`Inserting the tracks: ${tracksError.message}`)

    // No reload: the page refreshes itself for the first minute of a set's
    // life. Well inside that, the tracks have to be on screen.
    await expect(page.locator("tr[draggable]")).toHaveCount(3, { timeout: 20_000 })
  } finally {
    await devDb().from("playlists").delete().eq("id", playlist.id)
  }
})
