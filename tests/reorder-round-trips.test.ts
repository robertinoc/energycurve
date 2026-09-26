import { beforeEach, describe, expect, it, vi } from "vitest"

import { createFakeSupabase, type FakeSupabase } from "./helpers/supabase-fake"

/**
 * Breaking point #4: persisting a reorder cost two round trips per track, and
 * every one of them waited for the last.
 *
 * This is the only one of the four that is **not** silent. Nothing is lost and
 * no number is wrong — a 100-track set simply took 200 sequential round trips
 * to save. So there is no truncation to demonstrate and no before-red test
 * about correctness; what changed is latency, and that is what these measure.
 *
 * The two phases stay. They exist because `tracks` carries
 * `unique (playlist_id, position)`: parking every track above the real range
 * first is what stops the new order colliding with the old one half way
 * through. Issuing a phase concurrently is safe precisely because the positions
 * within it are distinct and, in phase one, 100,000 clear of anything real.
 */

let fake: FakeSupabase
/** How many updates were in flight at once, at the busiest moment. */
let peakConcurrency = 0

vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdminClient: () => fake }))
vi.mock("@/lib/observability/logger", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}))

const { reorderTracks } = await import("@/services/playlist-service")

const MINE = "profile-mine"
const SET = "set-1"
const SIZE = 40

/**
 * Wraps the fake so an update resolves on a later microtask instead of
 * immediately, which is what makes concurrency observable at all: with an
 * instant resolve, a sequential loop and a concurrent one are
 * indistinguishable.
 */
function instrument(inner: FakeSupabase): FakeSupabase {
  let inFlight = 0

  return {
    ...inner,
    from(table: string) {
      const builder = inner.from(table) as unknown as Record<string, unknown>
      const original = builder.then as unknown

      if (typeof original !== "function") {
        return builder as never
      }

      builder.then = function patched(
        this: unknown,
        resolve?: (value: unknown) => unknown,
        reject?: (reason: unknown) => unknown
      ) {
        inFlight += 1
        peakConcurrency = Math.max(peakConcurrency, inFlight)

        return (original as (...args: unknown[]) => unknown).call(
          this,
          (value: unknown) => {
            inFlight -= 1
            return resolve ? resolve(value) : value
          },
          reject
        )
      }

      return builder as never
    },
  } as FakeSupabase
}

beforeEach(() => {
  peakConcurrency = 0

  fake = instrument(
    createFakeSupabase({
      profiles: [{ id: MINE }],
      playlists: [{ id: SET, user_id: MINE, genre: "techno", context: "main" }],
      tracks: Array.from({ length: SIZE }, (_, index) => ({
        id: `t-${index}`,
        playlist_id: SET,
        position: index + 1,
        name: `Track ${index}`,
      })),
      playlist_versions: [],
    })
  )
})

describe("saving a reorder", () => {
  it("issues each phase concurrently instead of one track at a time", async () => {
    const reversed = Array.from({ length: SIZE }, (_, i) => `t-${SIZE - 1 - i}`)

    await reorderTracks(MINE, SET, reversed)

    // One at a time is exactly what this replaces: before the change the peak
    // was 1, whatever the size of the set.
    expect(peakConcurrency).toBeGreaterThan(1)
  })

  it("still parks every track before assigning any final position", async () => {
    // The invariant the two phases exist for, and the one a careless
    // "optimisation" would take out by running both phases at once. Asserted on
    // the order the statements were issued, not on the result, because the
    // result looks the same right up until a unique-constraint violation.
    const reversed = Array.from({ length: SIZE }, (_, i) => `t-${SIZE - 1 - i}`)

    await reorderTracks(MINE, SET, reversed)

    const updates = fake.log.filter(
      (statement) => statement.table === "tracks" && statement.op === "update"
    )

    expect(updates).toHaveLength(SIZE * 2)

    const lastPark = updates.findLastIndex((_, index) => index < SIZE)
    const firstAssign = SIZE

    expect(lastPark).toBeLessThan(firstAssign)
  })

  it("leaves the tracks in the order that was asked for", async () => {
    const reversed = Array.from({ length: SIZE }, (_, i) => `t-${SIZE - 1 - i}`)

    await reorderTracks(MINE, SET, reversed)

    const rows = (fake.tables.tracks as Array<Record<string, unknown>>)
      .slice()
      .sort((a, b) => (a.position as number) - (b.position as number))

    expect(rows.map((row) => row.id)).toEqual(reversed)
    expect(rows.map((row) => row.position)).toEqual(
      Array.from({ length: SIZE }, (_, index) => index + 1)
    )
  })
})
