import { beforeEach, describe, expect, it, vi } from "vitest"

import { importStillArriving, IMPORT_ARRIVAL_WINDOW_MS } from "@/lib/playlists/import-arrival"

import { createFakeSupabase, type FakeSupabase } from "./helpers/supabase-fake"

/**
 * IMP.1 — creating a set is two writes, and what each one's failure leaves.
 *
 * The three create paths (paste, file import, audio import) wrote the playlist
 * row and then its tracks as two requests. When the second failed, the action
 * told the DJ "something went wrong" and the library kept an empty set with the
 * file's name on it — counting against a free user's three. The first test
 * below fails against that code: the row is still there afterwards.
 */

let fake: FakeSupabase

vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: () => fake }))
vi.mock("@/lib/observability/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}))
vi.mock("@/services/billing-service", () => ({
  getProfileBilling: async () => ({ plan: "pro", status: "active" }),
}))
vi.mock("@/lib/analytics/posthog-server", () => ({ captureServerEvent: vi.fn() }))

const { createPlaylistWithTracks } = await import("@/services/playlist-service")

const OWNER = "profile-owner"

const INPUT = {
  name: "Warehouse, 3am",
  genre: "techno" as const,
  context: "main" as const,
  importSource: "rekordbox" as const,
}

const TRACKS = [
  { artist: "A", name: "One", bpm: 128, energyScore: 6 },
  { artist: "B", name: "Two", bpm: 129, energyScore: 7 },
  { artist: "C", name: "Three", bpm: 130, energyScore: 8 },
]

beforeEach(() => {
  fake = createFakeSupabase({
    profiles: [{ id: OWNER, plan: "pro", plan_status: "active" }],
    playlists: [],
    tracks: [],
  })
})

describe("createPlaylistWithTracks", () => {
  it("leaves no playlist behind when its tracks cannot be written", async () => {
    // The failure the import paths used to swallow into an orphaned empty set.
    fake.failNext("tracks", "insert into tracks failed")

    await expect(createPlaylistWithTracks(OWNER, INPUT, TRACKS)).rejects.toThrow()

    expect(fake.tables.playlists).toHaveLength(0)
    expect(fake.tables.tracks).toHaveLength(0)
  })

  it("creates the playlist with every track, in order, when nothing fails", async () => {
    const playlist = await createPlaylistWithTracks(OWNER, INPUT, TRACKS)

    expect(fake.tables.playlists).toHaveLength(1)
    expect(fake.tables.playlists[0]).toMatchObject({ id: playlist.id, user_id: OWNER })
    expect(
      fake.tables.tracks
        .filter((track) => track.playlist_id === playlist.id)
        .sort((a, b) => (a.position as number) - (b.position as number))
        .map((track) => track.name)
    ).toEqual(["One", "Two", "Three"])
  })

  it("still allows an empty manual playlist — filling one by hand is a real workflow", async () => {
    const playlist = await createPlaylistWithTracks(
      OWNER,
      { name: "To fill later", genre: "house", context: "opening" },
      []
    )

    expect(fake.tables.playlists.map((row) => row.id)).toEqual([playlist.id])
  })
})

describe("importStillArriving", () => {
  const created = "2026-10-02T12:00:00.000Z"
  const at = (seconds: number) => Date.parse(created) + seconds * 1000

  it("is true for an import with no tracks yet, just after it was created", () => {
    expect(
      importStillArriving({ importSource: "rekordbox", trackCount: 0, createdAt: created }, at(2))
    ).toBe(true)
  })

  it("is false once the tracks are there", () => {
    expect(
      importStillArriving({ importSource: "rekordbox", trackCount: 12, createdAt: created }, at(2))
    ).toBe(false)
  })

  it("is false for a manual playlist, which can legitimately be empty", () => {
    expect(
      importStillArriving({ importSource: null, trackCount: 0, createdAt: created }, at(2))
    ).toBe(false)
  })

  it("stops claiming anything after the window: an empty import that old is broken, not arriving", () => {
    const after = at(IMPORT_ARRIVAL_WINDOW_MS / 1000 + 1)

    expect(
      importStillArriving({ importSource: "rekordbox", trackCount: 0, createdAt: created }, after)
    ).toBe(false)
  })

  it("tolerates a server clock slightly behind the database's", () => {
    expect(
      importStillArriving({ importSource: "rekordbox", trackCount: 0, createdAt: created }, at(-2))
    ).toBe(true)
  })
})
