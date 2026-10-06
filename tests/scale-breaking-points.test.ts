import { describe, expect, it, vi } from "vitest"

import {
  createFakeSupabase,
  MAX_IN_LIST,
  type FakeSupabase,
  type Row,
} from "./helpers/supabase-fake"

/**
 * The breaking points of docs/qa/carga-2026-10.md, at the volumes where they
 * broke — not at three rows.
 *
 * Each level is one of the five the scale harness measured against dev
 * (`tests/perf/scale.perf.ts`). The harness proves the fix against the real
 * database; this file keeps it fixed, in `npm test`, without one. It can only do
 * that because the fake now refuses an `in()` longer than the longest that
 * passed against dev (`MAX_IN_LIST`), on top of the 1,000-row ceiling it already
 * had. Without either, every assertion below passed against the broken code.
 */

let fake: FakeSupabase

vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: () => fake }))
vi.mock("@/lib/observability/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}))
vi.mock("@/services/profile-service", () => ({
  syncProfileFromWorkOSUser: async () => ({ id: MINE, email: "dj@example.com" }),
}))
vi.mock("@/lib/analytics/posthog-server", () => ({ captureServerEvent: vi.fn() }))

const { getDashboardSnapshot } = await import("@/services/dashboard-service")
const { listPlaylists } = await import("@/services/playlist-service")
const { buildAccountExport } = await import("@/services/data-export-service")
const { ExportIncompleteError } = await import("@/lib/privacy/export-incomplete")
const { getGlobalLibrary } = await import("@/services/library-service")
const { listSharedWithMe } = await import("@/services/collaboration-service")

const MINE = "profile-mine"
const USER = { id: "workos-1", email: "dj@example.com" } as never

/** A library of `playlists × tracks`, owned by MINE, with distinct records. */
function library(playlists: number, tracks: number): { playlists: Row[]; tracks: Row[] } {
  const sets = Array.from({ length: playlists }, (_, index) => ({
    id: `p-${String(index).padStart(4, "0")}`,
    user_id: MINE,
    name: `Set ${index}`,
    created_at: `2026-01-01T00:00:00Z`,
    updated_at: `2026-09-01T00:00:${String(index % 60).padStart(2, "0")}Z`,
  }))

  return {
    playlists: sets,
    tracks: sets.flatMap((set) =>
      Array.from({ length: tracks }, (_, index) => ({
        id: `${set.id}-t-${String(index).padStart(4, "0")}`,
        playlist_id: set.id,
        position: index + 1,
        artist: `Artist ${set.id}`,
        name: `Track ${index}`,
        bpm: 124,
        musical_key: "8A",
      }))
    ),
  }
}

function seed(playlists: number, tracks: number) {
  fake = createFakeSupabase({
    profiles: [{ id: MINE, email: "dj@example.com", created_at: "2026-01-01T00:00:00Z" }],
    ...library(playlists, tracks),
  })
}

describe("the fake refuses what dev refused", () => {
  it("fails an in() longer than the longest that passed against dev", async () => {
    // The precondition of every other test here. If this stops failing, the
    // file below stops proving anything.
    seed(1, 1)
    const ids = Array.from({ length: MAX_IN_LIST + 1 }, (_, index) => `x-${index}`)

    const { error } = await fake.from("tracks").select("id").in("playlist_id", ids)

    expect(error).toBeTruthy()
  })
})

describe("point 1 · the dashboard, from ~400 sets", () => {
  it("loads, and counts every track, with 400 sets", async () => {
    seed(400, 10)

    const snapshot = await getDashboardSnapshot(USER)

    expect(snapshot.playlistCount).toBe(400)
    expect(snapshot.trackCount).toBe(4000)
  })
})

describe("point 5 · listPlaylists (H-21), on every dashboard page", () => {
  it("gives each of 100 sets its own count at 30,000 tracks, none of them 0", async () => {
    seed(100, 300)

    const listed = await listPlaylists(MINE)

    expect(listed).toHaveLength(100)
    expect(listed.every((set) => set.trackCount === 300)).toBe(true)
  })

  it("loads with 400 sets instead of throwing", async () => {
    seed(400, 10)

    const listed = await listPlaylists(MINE)

    expect(listed).toHaveLength(400)
    expect(listed.reduce((sum, set) => sum + set.trackCount, 0)).toBe(4000)
  })

  it("asks the database to count: no track row crosses the wire", async () => {
    seed(60, 1000)

    await listPlaylists(MINE)

    const trackRowsRead = fake.log
      .filter((statement) => statement.table === "tracks")
      .reduce((sum, statement) => sum + statement.rowsReturned, 0)

    expect(trackRowsRead).toBe(0)
  })
})

describe("point 2 · the data export", () => {
  it("exports every track of 400 sets, not zero", async () => {
    seed(400, 10)

    const data = await buildAccountExport(MINE)

    expect(data?.playlists).toHaveLength(400)
    expect(data?.tracks).toHaveLength(4000)
    expect(data?.counts.tracks).toBe(4000)
  })

  it("exports all 60,000 tracks, past the 50,000 that used to cut it silently", async () => {
    seed(60, 1000)

    const data = await buildAccountExport(MINE)

    expect(data?.tracks).toHaveLength(60_000)
    expect(new Set(data?.tracks.map((track) => track.id)).size).toBe(60_000)
  })

  it("fails loudly when a read fails, instead of delivering what it had", async () => {
    seed(10, 50)
    fake.failNext("tracks", "connection reset")

    await expect(buildAccountExport(MINE)).rejects.toBeInstanceOf(ExportIncompleteError)
  })

  it("fails loudly when the rows read and the database's count disagree", async () => {
    seed(10, 50)
    // A short read that looks complete: every page of tracks stops at 100
    // rows, so paging ends after the first and nothing errors. Only the count
    // — asked separately, with `head: true` — knows there were 500.
    const original = fake.from.bind(fake)
    fake.from = ((table: string) => {
      const builder = original(table)
      if (table !== "tracks") return builder
      const range = builder.range.bind(builder)
      builder.range = ((from: number, to: number) =>
        range(from, Math.min(to, from + 99))) as typeof builder.range
      return builder
    }) as typeof fake.from

    await expect(buildAccountExport(MINE)).rejects.toMatchObject({
      name: "ExportIncompleteError",
      table: "tracks",
      reason: "count_mismatch",
    })
  })
})

describe("the fourth copy of the in(): the global library", () => {
  it("shows 400 sets' records instead of an empty library", async () => {
    seed(400, 10)

    const summary = await getGlobalLibrary(MINE)

    // Ten records per set, distinct across sets by artist.
    expect(summary.recordCount).toBe(4000)
    expect(summary.truncated).toBe(false)
  })
})

describe("the third copy of the counting defect: sets shared with me", () => {
  function seedShared(sets: number, tracks: number) {
    const owned = library(sets, tracks)
    fake = createFakeSupabase({
      profiles: [{ id: MINE, email: "owner@example.com" }],
      ...owned,
      set_collaborators: owned.playlists.map((set, index) => ({
        id: `c-${index}`,
        playlist_id: set.id,
        invited_email: "friend@example.com",
        created_at: "2026-09-01T00:00:00Z",
        // The fake does not model embeds other than counts, so the row carries
        // what the select would have joined in.
        playlists: { id: set.id, name: set.name },
        profiles: { email: "owner@example.com" },
      })),
    })
  }

  it("counts each shared set's tracks past the first thousand", async () => {
    seedShared(5, 300)

    const shared = await listSharedWithMe("friend@example.com")

    expect(shared).toHaveLength(5)
    expect(shared.every((set) => set.trackCount === 300)).toBe(true)
  })

  it("shows no number, not 0, when the count cannot be read", async () => {
    seedShared(2, 3)
    fake.failNext("playlists", "timeout")

    const shared = await listSharedWithMe("friend@example.com")

    expect(shared.map((set) => set.trackCount)).toEqual([null, null])
  })
})

describe("the shared helper", () => {
  it("splits at 300, under the longest list that passed against dev", async () => {
    const { chunkIds, IN_FILTER_CHUNK } = await import("@/lib/supabase/paginate")

    expect(IN_FILTER_CHUNK).toBeLessThanOrEqual(MAX_IN_LIST)
    expect(chunkIds(Array.from({ length: 701 }, (_, index) => index)).map((c) => c.length)).toEqual([
      300, 300, 101,
    ])
  })
})
