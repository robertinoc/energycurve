import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createFakeSupabase,
  MAX_ROWS_PER_RESPONSE,
  type FakeSupabase,
} from "./helpers/supabase-fake"

/**
 * The dashboard against a library bigger than one PostgREST response.
 *
 * Breaking points #1 and #3 from `docs/qa/breaking-points-2026-09.md`, and both
 * fail the same way: quietly, with a plausible number. The dashboard is the
 * first screen after signing in, so a wrong count there is the first thing the
 * product ever tells a DJ about their own library.
 *
 * These assertions could not have failed before `MAX_ROWS_PER_RESPONSE` existed
 * in the fake: it used to return every seeded row regardless of paging, so code
 * that never paged looked correct here and truncated in production.
 */

let fake: FakeSupabase

vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: () => fake }))
vi.mock("@/services/profile-service", () => ({
  syncProfileFromWorkOSUser: async () => ({ id: MINE, email: "dj@example.com" }),
}))

const { getDashboardSnapshot } = await import("@/services/dashboard-service")

const MINE = "profile-mine"
const USER = { id: "workos-1", email: "dj@example.com" } as never

/** Comfortably past the ceiling, and past it on more than one playlist. */
const TRACKS_PER_PLAYLIST = 700
const PLAYLISTS = 4

beforeEach(() => {
  const playlists = Array.from({ length: PLAYLISTS }, (_, index) => ({
    id: `p-${index}`,
    user_id: MINE,
    name: `Set ${index}`,
    updated_at: `2026-09-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
  }))

  const tracks = playlists.flatMap((playlist) =>
    Array.from({ length: TRACKS_PER_PLAYLIST }, (_, index) => ({
      id: `${playlist.id}-t-${index}`,
      playlist_id: playlist.id,
      position: index + 1,
    }))
  )

  fake = createFakeSupabase({ profiles: [{ id: MINE }], playlists, tracks })
})

describe("counting a library that does not fit in one response", () => {
  it("reports every track, not the first thousand", async () => {
    // 2800 tracks against a 1000-row ceiling. Before the fix this returned
    // 1000 — a number a DJ has no way to recognise as wrong.
    const snapshot = await getDashboardSnapshot(USER)

    expect(snapshot.trackCount).toBe(PLAYLISTS * TRACKS_PER_PLAYLIST)
    expect(snapshot.trackCount).toBeGreaterThan(MAX_ROWS_PER_RESPONSE)
  })

  it("gives each set its own count, not a share of the first page", async () => {
    // The subtler half. Counting from a truncated fetch does not just lose the
    // total: it hands whatever rows arrived to whichever playlists they came
    // from, so the sets early in the page look full and the later ones look
    // empty. Every set here has the same number of tracks.
    const snapshot = await getDashboardSnapshot(USER)

    for (const playlist of snapshot.latestPlaylists) {
      expect(playlist.trackCount, playlist.name).toBe(TRACKS_PER_PLAYLIST)
    }
  })

  it("asks the database to count instead of counting the rows itself", async () => {
    // The shape of the fix, not just its result. A paginated fetch would also
    // produce the right numbers while still moving every row across the wire on
    // every dashboard load — correct and still wrong.
    await getDashboardSnapshot(USER)

    const trackReads = fake.log.filter(
      (statement) => statement.table === "tracks"
    )

    expect(trackReads.length).toBeGreaterThan(0)

    const rowsMoved = trackReads.reduce(
      (total, statement) => total + statement.rowsReturned,
      0
    )

    expect(
      rowsMoved,
      "the dashboard should count without fetching track rows"
    ).toBe(0)
  })
})

describe("listing more playlists than one response holds", () => {
  const MANY = 1200

  beforeEach(() => {
    fake = createFakeSupabase({
      profiles: [{ id: MINE }],
      playlists: Array.from({ length: MANY }, (_, index) => ({
        id: `p-${index}`,
        user_id: MINE,
        name: `Set ${index}`,
        updated_at: `2026-01-01T00:00:${String(index % 60).padStart(2, "0")}Z`,
      })),
      tracks: [],
    })
  })

  it("does not let the total and the list contradict each other", async () => {
    // `count: "exact"` was already asked for, so the total was right while the
    // list it sat above was capped at 1000. Nothing said so.
    const snapshot = await getDashboardSnapshot(USER)

    expect(snapshot.playlistCount).toBe(MANY)

    const listed = fake.log.filter(
      (statement) => statement.table === "playlists" && statement.op === "select"
    )
    const rowsRead = listed.reduce(
      (total, statement) => total + statement.rowsTouched,
      0
    )

    expect(rowsRead, "the list should read every playlist it counts").toBe(MANY)
  })
})
