import { expect, test, type Browser, type BrowserContext } from "@playwright/test"

import { accountFor, skipReason, storageStatePath } from "./helpers/accounts"
import {
  DEV_DB_SKIP_REASON,
  devDb,
  devDbConfigured,
  ownedPlaylistCount,
  playlistTrackCounts,
  profileIdFor,
  deleteSeeds,
  seededPlaylistIds,
  seedScale,
  seedStatus,
  tracksInOrder,
} from "./helpers/dev-db"

/**
 * The banco's session L17, as tests: what broke with a large library.
 *
 * Every row of L17 was a *silent* defect — the product showed a believable,
 * wrong number, or handed over a "your data" file with nothing in it, and
 * answered 200. Nobody notices that by using the product, which is why each
 * one was a manual row, and why each one is checked here by **counting**: the
 * number on the page or in the file against the number the database holds,
 * read by the service role and not by the code under test.
 *
 * ## The volume, and where it lives
 *
 * `scripts/seed-scale.mjs` writes it — run, never edited — at the sizes where
 * each defect showed up (docs/qa/carga-2026-10.md):
 *
 * | Seed | Owner  | Shape           | What it reaches                                   |
 * |------|--------|-----------------|---------------------------------------------------|
 * | 1701 | PRO+   | 400 sets × 3    | an `in()` of 400 ids, and 1,200 tracks in total   |
 * | 1703 | PRO+   | 1 set × 1,200   | a shared set past PostgREST's 1,000-row page      |
 * | 1702 | PRO    | 1 set × 1,200   | a set page and a reorder past 1,000 tracks        |
 *
 * PRO+ owns the library-sized half because the global library is a PRO+
 * capability and sharing is gated on the *owner's* plan; PRO is the reader of
 * the shared set and the owner of the big one.
 *
 * ## Why it cannot hurt the rest of the suite
 *
 * The dev database is shared, and seeding from a test is the one thing that
 * could make the suite fail "sometimes" for reasons nobody can find. So:
 *
 * - It runs only in `auth-proPlus`, inside the authenticated shard, which is
 *   one worker by design (playwright.config.ts): no other authenticated test
 *   runs while these rows exist.
 * - It seeds in `beforeAll` and deletes **its own seeds** in `afterAll`, by
 *   seed number — never with `seed-scale.mjs clean`, which deletes every marked
 *   row in dev whoever wrote it (see `deleteSeeds` for the day that mattered).
 *   The seeded rows carry `created_at` in September, so the `since`-based
 *   cleanup of the other specs never sees them, and this file never has to
 *   trust theirs.
 * - It refuses to start if dev already holds marked rows, whoever's they are:
 *   another session's seeds could land on these accounts and change the
 *   counts asserted here. It skips with that reason instead.
 * - It closes by asserting the two accounts own exactly what they owned before
 *   (the banco's E2E.2), so a cleanup that silently failed is a red row here
 *   and not a poisoned next run.
 */

const SEEDS = { library: 1701, mine: 1702, shared: 1703 } as const
const LIBRARY_SETS = 400
const LIBRARY_TRACKS_PER_SET = 3
const BIG_SET_TRACKS = 1200

test.describe.configure({ mode: "default", timeout: 180_000 })

const proPlus = accountFor("proPlus")
const pro = accountFor("pro")

interface World {
  proPlusId: string
  proId: string
  ownedBefore: { proPlus: number; pro: number }
  bigSetId: string
  sharedSetId: string
}

let world: World | null = null

test.beforeAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "auth-proPlus") return
  if (!proPlus || !pro || !devDbConfigured()) return

  const status = seedStatus()

  if (status.markedPlaylists > 0) {
    // Not ours to delete: see the comment at the top of the file.
    return
  }

  const proPlusId = await profileIdFor(proPlus.email)
  const proId = await profileIdFor(pro.email)
  const ownedBefore = {
    proPlus: await ownedPlaylistCount(proPlusId),
    pro: await ownedPlaylistCount(proId),
  }

  seedScale(["seed", "--seed", String(SEEDS.library), "--owner", proPlus.email,
    "--playlists", String(LIBRARY_SETS), "--tracks", String(LIBRARY_TRACKS_PER_SET)])
  seedScale(["seed", "--seed", String(SEEDS.shared), "--owner", proPlus.email,
    "--playlists", "1", "--tracks", String(BIG_SET_TRACKS)])
  seedScale(["seed", "--seed", String(SEEDS.mine), "--owner", pro.email,
    "--playlists", "1", "--tracks", String(BIG_SET_TRACKS)])

  const bigSetId = await onlySeededSet(proId, SEEDS.mine)
  const sharedSetId = await onlySeededSet(proPlusId, SEEDS.shared)

  // Sharing through the interface means the owner typing an email into a
  // form; what L17.4 is about is the count the reader sees, so the share is
  // written the way the service writes it. It goes with the set: the foreign
  // key cascades.
  const { error } = await devDb().from("set_collaborators").insert({
    playlist_id: sharedSetId,
    invited_email: pro.email.toLowerCase(),
    invited_by: proPlusId,
  })

  if (error) throw new Error(`Sharing the seeded set: ${error.message}`)

  world = { proPlusId, proId, ownedBefore, bigSetId, sharedSetId }
})

test.afterAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "auth-proPlus" || !world) return

  const seeded = world
  world = null

  await deleteSeeds(Object.values(SEEDS))

  // E2E.2: the base is as it was. Asserted, not hoped.
  for (const seed of Object.values(SEEDS)) {
    expect(await seededPlaylistIds(seed), `playlists of seed ${seed} left in dev`).toEqual([])
  }
  expect(await ownedPlaylistCount(seeded.proPlusId), "PRO+ owns what it owned before").toBe(
    seeded.ownedBefore.proPlus
  )
  expect(await ownedPlaylistCount(seeded.proId), "PRO owns what it owned before").toBe(
    seeded.ownedBefore.pro
  )
})

/** The one playlist a given seed wrote for this owner. */
async function onlySeededSet(ownerId: string, seed: number): Promise<string> {
  const { data, error } = await devDb()
    .from("playlists")
    .select("id")
    .eq("user_id", ownerId)
    .like("description", `[scale-seed:${seed}]%`)

  if (error) throw new Error(error.message)
  if (data?.length !== 1) throw new Error(`Seed ${seed} wrote ${data?.length ?? 0} sets, expected 1`)

  return data[0].id as string
}

function requireWorld(): World {
  const { name } = test.info().project

  test.skip(name !== "auth-proPlus", "Volume specs run once, in auth-proPlus: they seed two accounts.")
  test.skip(!proPlus, skipReason("proPlus"))
  test.skip(!pro, skipReason("pro"))
  test.skip(!devDbConfigured(), DEV_DB_SKIP_REASON)
  test.skip(
    world === null,
    "Dev already held rows marked by scripts/seed-scale.mjs when this file started — another " +
      "session measuring, or a run of this file that died before its cleanup. They could change " +
      "the counts asserted here. `node scripts/seed-scale.mjs status` says how many; delete them " +
      "only if you know whose they are. Skipped, not passed — nothing was counted."
  )

  return world!
}

async function asPro(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ storageState: storageStatePath("pro") })
}

test.describe("a large library (banco L17)", () => {
  test("L17.1 · the data export carries every track, counted by id", async ({ page }) => {
    const { proPlusId } = requireWorld()

    // The route allows three exports an hour per account, and this suite is
    // run three times before a merge. The bucket is the account's own, in dev.
    await devDb().from("rate_limit_buckets").delete().eq("key", `account-export:${proPlusId}`)

    const counts = await playlistTrackCounts(proPlusId)
    const expected = [...counts.values()].reduce((sum, row) => sum + row.count, 0)
    expect(expected, "the seed is the size this test is about").toBeGreaterThanOrEqual(
      LIBRARY_SETS * LIBRARY_TRACKS_PER_SET + BIG_SET_TRACKS
    )

    const response = await page.request.get("/api/account/export", { timeout: 120_000 })
    expect(response.status(), await response.text().catch(() => "")).toBe(200)

    const data = (await response.json()) as {
      tracks: Array<{ id: string }>
      counts?: { tracks?: number }
    }

    // The defect: with ~400 playlists the file had zero tracks, and past
    // 50,000 it repeated some — always with a 200. Distinct ids against the
    // database is the only count that catches both.
    expect(new Set(data.tracks.map((track) => track.id)).size).toBe(expected)
    expect(data.tracks.length, "no track twice").toBe(expected)
    expect(data.counts?.tracks, "the file's own header agrees").toBe(expected)
  })

  test("L17.2 · every playlist in the sidebar shows its own track count", async ({ page }) => {
    const { proPlusId } = requireWorld()
    const expected = await playlistTrackCounts(proPlusId)

    await page.goto("/dashboard")

    const shown = await page
      .locator('a[href^="/dashboard/playlists/"]')
      .evaluateAll((links) =>
        links.map(
          (link) =>
            [
              link.getAttribute("href")!.split("/").pop()!,
              link.querySelector("span:last-child")?.textContent?.trim() ?? "",
            ] as const
        )
      )
    const sidebar = new Map(shown.filter(([, count]) => /^\d+$/.test(count)))

    expect(sidebar.size, "every playlist is listed").toBe(expected.size)

    const wrong = [...expected].filter(([id, row]) => sidebar.get(id) !== String(row.count))
    expect(wrong.map(([id, row]) => `${row.name}: ${sidebar.get(id)} ≠ ${row.count}`)).toEqual([])
  })

  test("L17.3 · the global library is not empty, and reaches the oldest set", async ({ page }) => {
    const { proPlusId } = requireWorld()
    const counts = await playlistTrackCounts(proPlusId)
    const oldest = [...counts].sort(([, a], [, b]) => a.createdAt.localeCompare(b.createdAt))[0][0]

    const { data: track } = await devDb()
      .from("tracks")
      .select("artist, name")
      .eq("playlist_id", oldest)
      .order("position", { ascending: true })
      .limit(1)
      .single()

    await page.goto("/dashboard/library")

    await expect(page.locator("li", { hasText: `${track!.artist} — ${track!.name}` }).first()).toBeVisible()
  })

  test("L17.4 · a shared set shows its real track count to the reader", async ({ browser }) => {
    const { sharedSetId } = requireWorld()
    const context = await asPro(browser)

    try {
      const page = await context.newPage()
      await page.goto("/dashboard/shared")

      const card = page.locator(`a[href*="${sharedSetId}"]`).first()
      await expect(card).toBeVisible()
      // Before lote 17 the reader saw the first 1,000 rows' worth: 1000.
      //
      // The count's own line, anchored at its start. Matching the card's text
      // was too weak: the seeded name ends in a digit and the two run
      // together ("Velvet Granite 11000 · Shared by…" in the red run), so a
      // count of 200 would have read as "…1200 ·" and passed.
      await expect(card.locator("p", { hasText: /Shared by|Compartido por/ })).toHaveText(
        new RegExp(`^${BIG_SET_TRACKS} · `)
      )
    } finally {
      await context.close()
    }
  })

  test("L17.6 · a set of more than 1,000 tracks is shown whole", async ({ browser }) => {
    const { bigSetId } = requireWorld()
    const context = await asPro(browser)

    try {
      const page = await context.newPage()
      await page.goto(`/dashboard/playlists/${bigSetId}`)

      const rows = page.locator("tr[draggable]")
      await expect(rows).toHaveCount(BIG_SET_TRACKS, { timeout: 30_000 })
      await expect(rows.last().locator("td").nth(1)).toHaveText(String(BIG_SET_TRACKS))
    } finally {
      await context.close()
    }
  })

  test("L17.5 · a big set reorders, reorders again, and keeps the order", async ({ browser }) => {
    const { bigSetId } = requireWorld()
    const context = await asPro(browser)

    try {
      const page = await context.newPage()
      const original = await tracksInOrder(bigSetId)
      expect(original).toHaveLength(BIG_SET_TRACKS)

      await page.goto(`/dashboard/playlists/${bigSetId}`)
      const rows = page.locator("tr[draggable]")
      await expect(rows).toHaveCount(BIG_SET_TRACKS, { timeout: 30_000 })

      // The rows arrive in the server's HTML before React is listening to
      // them, and a click or a drag in between is dropped without a trace.
      // The signal is the table answering: hovering a row draws its marker on
      // the curve (the fix of J.5), which only happens once the row's handlers
      // are live. Hovering is idempotent, so moving the pointer until the
      // marker shows is a wait for state — the assertions this test is about
      // are below and are never repeated.
      const marker = page.locator('svg line[stroke-dasharray="5 5"]')
      await expect(async () => {
        await rows.nth(1).hover()
        await rows.nth(0).hover()
        await expect(marker).toHaveCount(1, { timeout: 500 })
      }, "the table answers the pointer").toPass({ timeout: 60_000 })

      // Reordered by sorting a column, not by dragging. A drag across a
      // 1,200-row table is not something Playwright does reliably — the page
      // scrolls under the pointer mid-drag, and the first version of this test
      // saved orders nobody asked for (the instrument, not the product). A
      // column sort rewrites every position, which is the save that used to
      // fail past ~1,000 tracks, and its result can be computed exactly: the
      // table's sort is a stable sort on BPM.
      const bpmHeader = page.locator("thead button", { hasText: /^BPM/ })

      // The unsaved-order bar appears with a change and goes away only when a
      // save succeeds (a failed save keeps it). The button's own label is no
      // signal: it reads "Saving…" while the save runs. And a save is not over
      // when the bar goes: the action revalidates the page, and the workspace
      // is keyed on the tracks' positions (app/(en)/dashboard/playlists/[id]/
      // page.tsx), so it remounts with the server's order. The old table
      // leaving the document is the signal that it did.
      const unsaved = page.getByText("Preview — unsaved order")
      const save = page.getByRole("button", { name: "Save order" })

      async function sortAndSave(clicks: number) {
        const before = await rows.first().elementHandle()

        for (let i = 0; i < clicks; i++) await bpmHeader.click()
        await expect(unsaved, "the sort registered as an unsaved change").toBeVisible()
        await save.click()
        await expect(unsaved, "the save finished, and succeeded").toBeHidden({ timeout: 90_000 })
        await expect
          .poll(() => before!.evaluate((row) => row.isConnected), {
            message: "the workspace remounted with the saved order",
            timeout: 60_000,
          })
          .toBe(false)
      }

      const byBpm = (list: typeof original, dir: 1 | -1) =>
        [...list].sort(
          (a, b) =>
            ((a.bpm ?? Number.NEGATIVE_INFINITY) - (b.bpm ?? Number.NEGATIVE_INFINITY)) * dir
        )

      // Ascending: one click. Then descending: after the remount the sort
      // state is fresh, so the first click sorts ascending again (no change)
      // and the second turns it around.
      await sortAndSave(1)
      const ascending = byBpm(original, 1)
      expect((await tracksInOrder(bigSetId)).map((t) => t.id), "the first save, in the database").toEqual(
        ascending.map((t) => t.id)
      )

      await sortAndSave(2)
      const descending = byBpm(ascending, -1)
      expect((await tracksInOrder(bigSetId)).map((t) => t.id), "the second save, in the database").toEqual(
        descending.map((t) => t.id)
      )

      // And what a reload shows: every track, highest BPM first.
      await page.reload()
      await expect(rows).toHaveCount(BIG_SET_TRACKS, { timeout: 30_000 })
      await expect(rows.first()).toContainText(String(descending[0].bpm))
    } finally {
      await context.close()
    }
  })
})
