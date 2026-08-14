import { describe, expect, it } from "vitest"

import {
  MAX_VERSIONS_PER_PLAYLIST,
  parseSnapshot,
  restorableOrder,
  sameOrder,
  snapshotOf,
  versionsToPrune,
  type VersionKind,
} from "@/lib/playlists/versions"

const track = (id: string, position: number) => ({
  id,
  position,
  artist: `Artist ${id}`,
  name: `Track ${id}`,
  bpm: 124,
  energy_score: null,
})

describe("snapshotOf", () => {
  it("records the saved order, whatever order the rows arrive in", () => {
    const snapshot = snapshotOf([track("c", 3), track("a", 1), track("b", 2)])

    expect(snapshot.map((entry) => entry.trackId)).toEqual(["a", "b", "c"])
  })

  it("renumbers positions 1..n instead of copying them", () => {
    // Two identical orders must produce identical snapshots, and a gap left by a
    // mid-edit state would make them look different.
    const snapshot = snapshotOf([track("a", 4), track("b", 9)])

    expect(snapshot.map((entry) => entry.position)).toEqual([1, 2])
  })

  it("carries enough of the track to survive it being deleted later", () => {
    const [entry] = snapshotOf([track("a", 1)])

    expect(entry.artist).toBe("Artist a")
    expect(entry.name).toBe("Track a")
    expect(entry.bpm).toBe(124)
  })
})

describe("sameOrder", () => {
  const order = [{ trackId: "a" }, { trackId: "b" }]

  it("is true for the same ids in the same sequence", () => {
    expect(sameOrder(order, [{ trackId: "a" }, { trackId: "b" }])).toBe(true)
  })

  it("is false once the sequence changes", () => {
    expect(sameOrder(order, [{ trackId: "b" }, { trackId: "a" }])).toBe(false)
    expect(sameOrder(order, [{ trackId: "a" }])).toBe(false)
  })
})

describe("versionsToPrune", () => {
  const version = (id: string, kind: VersionKind = "curated") => ({ id, kind })

  it("keeps nothing to prune while under the cap", () => {
    expect(versionsToPrune([version("1"), version("2")])).toEqual([])
  })

  it("drops the oldest once the cap is passed", () => {
    const versions = Array.from({ length: MAX_VERSIONS_PER_PLAYLIST + 3 }, (_, i) =>
      version(String(i))
    )

    expect(versionsToPrune(versions).map((v) => v.id)).toEqual(["20", "21", "22"])
  })

  it("never prunes the imported version, even when it is the oldest row", () => {
    // The rule that matters. It's the only version that can answer "was my
    // original order worse?", it can't be recreated, and it is always the oldest
    // — so plain "keep the newest N" would delete exactly the wrong one.
    const versions = [
      ...Array.from({ length: MAX_VERSIONS_PER_PLAYLIST + 2 }, (_, i) =>
        version(String(i))
      ),
      version("original", "imported"),
    ]

    const pruned = versionsToPrune(versions)

    expect(pruned.some((v) => v.id === "original")).toBe(false)
    expect(pruned).toHaveLength(3)
  })

  it("counts the imported version inside the budget, not outside it", () => {
    const versions = [
      ...Array.from({ length: MAX_VERSIONS_PER_PLAYLIST - 1 }, (_, i) =>
        version(String(i))
      ),
      version("original", "imported"),
    ]

    expect(versionsToPrune(versions)).toEqual([])
  })
})

describe("parseSnapshot", () => {
  it("reads a well-formed snapshot", () => {
    const parsed = parseSnapshot([
      {
        trackId: "a",
        position: 1,
        artist: "A",
        name: "One",
        bpm: 120,
        energyScore: 6,
      },
    ])

    expect(parsed).toHaveLength(1)
    expect(parsed[0].energyScore).toBe(6)
  })

  it("drops malformed entries instead of crashing the history", () => {
    // The column is jsonb: a row from an older shape of this code has to degrade
    // to a shorter version, never to an error page.
    const parsed = parseSnapshot([
      { trackId: "a", position: 1, artist: "A", name: "One" },
      { trackId: 42, position: 2, artist: "B", name: "Two" },
      null,
      "nonsense",
    ])

    expect(parsed.map((entry) => entry.trackId)).toEqual(["a"])
    expect(parsed[0].bpm).toBeNull()
  })

  it("returns nothing for a value that isn't a list", () => {
    expect(parseSnapshot({ tracks: [] })).toEqual([])
    expect(parseSnapshot(null)).toEqual([])
  })
})

describe("restorableOrder", () => {
  const version = [
    { trackId: "a", position: 1, artist: "A", name: "1", bpm: null, energyScore: null },
    { trackId: "b", position: 2, artist: "B", name: "2", bpm: null, energyScore: null },
  ]

  it("returns the order when the version still describes the set", () => {
    expect(restorableOrder(version, ["b", "a"])).toEqual(["a", "b"])
  })

  it("still restores after a track was deleted", () => {
    // Nothing is lost: the version places every track the set still has, and the
    // deleted one simply isn't there to place.
    expect(restorableOrder(version, ["a"])).toEqual(["a"])
  })

  it("refuses when a track has been added since", () => {
    // This is the case that would destroy data. The version says nothing about
    // "c", so honouring it would drop "c" out of the playlist entirely.
    expect(restorableOrder(version, ["a", "b", "c"])).toBeNull()
  })
})
