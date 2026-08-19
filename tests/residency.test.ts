import { describe, expect, it } from "vitest"

import {
  RESIDENCY_LOOKBACK_SETS,
  normalizeVenue,
  residencyRepeats,
  sameVenue,
  summarizeResidency,
  type PlayedSet,
  type ResidencyTrack,
} from "@/lib/playlists/residency"

const track = (artist: string, name: string, position: number): ResidencyTrack => ({
  artist,
  name,
  position,
})

function playedSet(
  playlistName: string,
  playedAt: string,
  tracks: [string, string][]
): PlayedSet {
  return {
    playlistId: playlistName,
    playlistName,
    playedAt,
    tracks: tracks.map(([artist, name]) => ({ artist, name })),
  }
}

describe("matching a venue", () => {
  it("ignores case and surrounding whitespace", () => {
    // One venue to the person typing it, three strings to Postgres.
    expect(sameVenue("Club X", "club x")).toBe(true)
    expect(sameVenue("  Club X  ", "Club X")).toBe(true)
    expect(sameVenue("Club   X", "Club X")).toBe(true)
  })

  it("keeps different venues apart", () => {
    expect(sameVenue("Club X", "Club Y")).toBe(false)
  })

  it("never matches an unknown venue to anything", () => {
    // Treating null as matchable would collide every blank-venue set with every
    // other one, which is the opposite of the feature.
    expect(sameVenue(null, null)).toBe(false)
    expect(sameVenue("Club X", null)).toBe(false)
    expect(sameVenue("", "")).toBe(false)
    expect(sameVenue("   ", "Club X")).toBe(false)
  })

  it("normalises without rewriting what the DJ typed", () => {
    expect(normalizeVenue("  Club   X ")).toBe("club x")
    expect(normalizeVenue(null)).toBeNull()
    expect(normalizeVenue("   ")).toBeNull()
  })
})

describe("finding repeats at a venue", () => {
  const planned = [
    track("Sopik", "Call Me Daddy", 1),
    track("T78", "Emergency", 2),
    track("Sara Landry", "Pressure", 3),
  ]

  it("flags a track played at the last date", () => {
    const repeats = residencyRepeats(planned, [
      playedSet("Aug", "2026-08-01T02:00:00Z", [["T78", "Emergency"]]),
    ])

    expect(repeats).toHaveLength(1)
    expect(repeats[0].name).toBe("Emergency")
    expect(repeats[0].setsAgo).toBe(1)
    expect(repeats[0].position).toBe(2)
  })

  it("counts how many dates ago, not how many days", () => {
    // The unit a DJ thinks in, and the one that stays meaningful whether the
    // residency is weekly or quarterly.
    const repeats = residencyRepeats(planned, [
      playedSet("Aug", "2026-08-01T02:00:00Z", [["Sopik", "Call Me Daddy"]]),
      playedSet("Jul", "2026-07-01T02:00:00Z", [["T78", "Emergency"]]),
    ])

    expect(repeats.find((r) => r.name === "Call Me Daddy")!.setsAgo).toBe(1)
    expect(repeats.find((r) => r.name === "Emergency")!.setsAgo).toBe(2)
  })

  it("reports only the most recent appearance of a track", () => {
    // Played at all three of the last dates is one problem, not three — listing it
    // three times would bury the tracks played once each.
    const repeats = residencyRepeats(planned, [
      playedSet("Aug", "2026-08-01T02:00:00Z", [["T78", "Emergency"]]),
      playedSet("Jul", "2026-07-01T02:00:00Z", [["T78", "Emergency"]]),
      playedSet("Jun", "2026-06-01T02:00:00Z", [["T78", "Emergency"]]),
    ])

    expect(repeats).toHaveLength(1)
    expect(repeats[0].setsAgo).toBe(1)
  })

  it("ignores dates beyond the lookback", () => {
    const older = playedSet("Old", "2026-01-01T02:00:00Z", [
      ["Sara Landry", "Pressure"],
    ])
    const history = [
      playedSet("Aug", "2026-08-01T02:00:00Z", []),
      playedSet("Jul", "2026-07-01T02:00:00Z", []),
      playedSet("Jun", "2026-06-01T02:00:00Z", []),
      older,
    ]

    expect(residencyRepeats(planned, history)).toHaveLength(0)
    // Same history, wider window: now it's in range.
    expect(residencyRepeats(planned, history, 4)).toHaveLength(1)
  })

  it("matches through remix suffixes and accents, like the library does", () => {
    // Same normalisation as set comparison: a DJ who played "(Original Mix)" and
    // plans the plain title has played the same record.
    const repeats = residencyRepeats(
      [track("Sopik", "Call Me Daddy", 1)],
      [
        playedSet("Aug", "2026-08-01T02:00:00Z", [
          ["Sopik", "Call Me Daddy (Original Mix)"],
        ]),
      ]
    )

    expect(repeats).toHaveLength(1)
  })

  it("sorts the most recently played first", () => {
    const repeats = residencyRepeats(planned, [
      playedSet("Aug", "2026-08-01T02:00:00Z", [["Sara Landry", "Pressure"]]),
      playedSet("Jul", "2026-07-01T02:00:00Z", [["Sopik", "Call Me Daddy"]]),
    ])

    // What the room would actually remember, first.
    expect(repeats.map((r) => r.setsAgo)).toEqual([1, 2])
  })

  it("returns nothing when there is nothing to compare", () => {
    expect(residencyRepeats([], [playedSet("Aug", "x", [["A", "B"]])])).toEqual([])
    expect(residencyRepeats(planned, [])).toEqual([])
    expect(residencyRepeats(planned, [playedSet("Aug", "x", [])], 0)).toEqual([])
  })
})

describe("summarising", () => {
  it("tells 'nothing repeats' apart from 'nothing to compare against'", () => {
    // These look identical in a count and mean opposite things to someone deciding
    // whether to trust the check.
    const noHistory = summarizeResidency("Club X", [track("A", "B", 1)], [])
    expect(noHistory.noHistory).toBe(true)
    expect(noHistory.repeats).toEqual([])

    const clean = summarizeResidency(
      "Club X",
      [track("A", "B", 1)],
      [playedSet("Aug", "2026-08-01T02:00:00Z", [["C", "D"]])]
    )
    expect(clean.noHistory).toBe(false)
    expect(clean.repeats).toEqual([])
  })

  it("does not claim missing history when there is no venue at all", () => {
    const summary = summarizeResidency(null, [track("A", "B", 1)], [])
    expect(summary.noHistory).toBe(false)
    expect(summary.venue).toBeNull()
  })

  it("reports how many dates it actually looked at", () => {
    const history = Array.from({ length: 5 }, (_, index) =>
      playedSet(`set${index}`, "2026-08-01T02:00:00Z", [])
    )

    expect(
      summarizeResidency("Club X", [track("A", "B", 1)], history).setsConsidered
    ).toBe(RESIDENCY_LOOKBACK_SETS)
    expect(
      summarizeResidency("Club X", [track("A", "B", 1)], history.slice(0, 2))
        .setsConsidered
    ).toBe(2)
  })
})
