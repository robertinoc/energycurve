import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createFakeSupabase,
  OWNER,
  seedTwoOwners,
  STRANGER,
  type FakeSupabase,
} from "./helpers/supabase-fake"

/**
 * Data ownership, tested where it is actually enforced.
 *
 * AGENTS.md is explicit: "Data ownership is enforced in the service layer
 * (`services/*-service.ts`): every playlist/track function takes a `profileId`
 * and scopes queries by it. Never skip that check — RLS will not catch it."
 *
 * That makes `services/` the security boundary of the whole product, and until
 * now it had no tests at all. RLS is enabled with zero policies, which is
 * default-deny for `anon` and `authenticated` — but every real query runs
 * through the service-role client, which bypasses RLS by design. So a forgotten
 * `.eq("user_id", profileId)` is not caught by the database, by a type, or by a
 * review checklist. It is caught here or it is not caught.
 *
 * The fake applies filters rather than recording them (see the helper), so
 * "a stranger cannot read this playlist" is a claim about behaviour: drop the
 * ownership filter in the service and these tests go red.
 */

let fake: FakeSupabase

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => fake,
}))

// Logging and analytics are side channels; silence them so a failure here is
// about ownership rather than about a missing PostHog key.
vi.mock("@/lib/observability/logger", () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}))
vi.mock("@/lib/analytics/posthog-server", () => ({
  captureServerEvent: vi.fn(),
}))
vi.mock("@/services/version-service", () => ({
  captureVersion: vi.fn(async () => undefined),
}))

const service = await import("@/services/playlist-service")

beforeEach(() => {
  fake = createFakeSupabase(seedTwoOwners())
})

describe("reading another DJ's set", () => {
  it("getOwnedPlaylist returns null for a playlist the profile does not own", async () => {
    await expect(
      service.getOwnedPlaylist(STRANGER, "playlist-owned")
    ).resolves.toBeNull()
  })

  it("and returns it for the profile that does", async () => {
    const playlist = await service.getOwnedPlaylist(OWNER, "playlist-owned")

    expect(playlist).not.toBeNull()
    expect(playlist?.id).toBe("playlist-owned")
  })

  it("getOwnedPlaylistWithTracks hands back no tracks to a stranger", async () => {
    // The tracks query filters by playlist_id alone — it is the playlist lookup
    // above it that carries the ownership check. If that lookup ever stops
    // short-circuiting, this is the test that notices the tracks came anyway.
    await expect(
      service.getOwnedPlaylistWithTracks(STRANGER, "playlist-owned")
    ).resolves.toBeNull()

    const trackReads = fake.log.filter((s) => s.table === "tracks")
    expect(trackReads).toHaveLength(0)
  })

  it("scopes the ownership check on user_id, not just on id", async () => {
    await service.getOwnedPlaylist(OWNER, "playlist-owned")

    const read = fake.log.find((s) => s.table === "playlists")
    const columns = read?.filters.map(([column]) => column)

    expect(columns).toContain("user_id")
  })

  it("listPlaylists never returns a row belonging to someone else", async () => {
    const listed = await service.listPlaylists(OWNER)

    expect(listed.map((playlist) => playlist.id)).toEqual(["playlist-owned"])
  })

  it("countPlaylists counts only the caller's", async () => {
    await expect(service.countPlaylists(OWNER)).resolves.toBe(1)
    await expect(service.countPlaylists(STRANGER)).resolves.toBe(1)
  })
})

describe("writing to another DJ's set", () => {
  /**
   * Each of these is a mutation that takes a playlist id from the client. The
   * assertion is the same in every case and it is deliberately about the data,
   * not about the error: refusing loudly while having already deleted the rows
   * would pass a weaker test.
   */
  const mutations: Array<[name: string, run: () => Promise<unknown>]> = [
    ["updatePlaylistDetails", () =>
      service.updatePlaylistDetails(STRANGER, "playlist-owned", {
        name: "hijacked",
        description: null,
      })],
    ["deletePlaylist", () => service.deletePlaylist(STRANGER, "playlist-owned")],
    ["addTrack", () =>
      service.addTrack(STRANGER, "playlist-owned", {
        name: "intruder",
        artist: "nobody",
        bpm: 128,
        energyScore: 6,
      } as never)],
    ["removeTrack", () =>
      service.removeTrack(STRANGER, "playlist-owned", "track-owned-1")],
    ["moveTrack", () =>
      service.moveTrack(STRANGER, "playlist-owned", "track-owned-1", "down")],
    ["replaceTracks", () =>
      service.replaceTracks(STRANGER, "playlist-owned", [])],
  ]

  for (const [name, run] of mutations) {
    it(`${name} leaves the owner's rows untouched`, async () => {
      const before = structuredClone(fake.tables)

      await run().catch(() => {
        // Throwing is the expected shape for most of these. What matters is
        // asserted below, and it is the same either way.
      })

      expect(fake.tables.playlists).toEqual(before.playlists)
      expect(fake.tables.tracks).toEqual(before.tracks)
    })
  }

  /**
   * These two survive removing the check from `getOwnedPlaylist`, because they
   * re-scope on `user_id` in the write itself. That is defence in depth and it
   * is worth keeping: the lookup above is one refactor away from becoming a
   * cheaper query, and on that day these two statements are the only thing
   * between a stranger and someone else's set.
   *
   * Verified by deleting the ownership filter in `getOwnedPlaylist` on
   * 2026-09-11: seven tests in this file went red, and these two did not.
   */
  it("deletePlaylist re-scopes on user_id in the delete itself", async () => {
    await service.deletePlaylist(OWNER, "playlist-owned").catch(() => {})

    const del = fake.log.find((s) => s.table === "playlists" && s.op === "delete")
    expect(del?.filters.map(([column]) => column)).toContain("user_id")
  })

  it("updatePlaylistDetails re-scopes on user_id in the update itself", async () => {
    await service
      .updatePlaylistDetails(OWNER, "playlist-owned", { name: "x", description: null })
      .catch(() => {})

    const update = fake.log.find((s) => s.table === "playlists" && s.op === "update")
    expect(update?.filters.map(([column]) => column)).toContain("user_id")
  })

  it("the owner's own rename does go through, so the suite isn't vacuous", async () => {
    // Every test above passes trivially if the service is broken for everyone.
    await service.updatePlaylistDetails(OWNER, "playlist-owned", {
      name: "Warm-up, tighter",
      description: null,
    })

    const renamed = fake.tables.playlists.find((row) => row.id === "playlist-owned")
    expect(renamed?.name).toBe("Warm-up, tighter")
  })
})

describe("the public curve page's deliberate exception", () => {
  it("getPlaylistWithTracksById reads without an ownership check, by design", async () => {
    // Its docblock says so: the signed link's signature stands in for ownership.
    // Pinned here because it is the one function in the file a new call site
    // must never reach for — a regression would be someone reusing it as a
    // convenient loader, and this test is where that conversation starts.
    const playlist = await service.getPlaylistWithTracksById("playlist-owned")

    expect(playlist?.id).toBe("playlist-owned")

    const read = fake.log.find((s) => s.table === "playlists")
    expect(read?.filters.map(([column]) => column)).not.toContain("user_id")
  })
})
