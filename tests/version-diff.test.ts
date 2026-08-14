import { describe, expect, it } from "vitest"

import {
  curveDomain,
  diffVersions,
  MIN_CURVE_SPAN,
  scoreDelta,
} from "@/lib/playlists/version-diff"
import type { VersionTrack } from "@/lib/playlists/versions"

/** A snapshot from a list of ids, in the given order. */
function snapshot(
  ids: readonly string[],
  energies?: readonly number[]
): VersionTrack[] {
  return ids.map((id, index) => ({
    trackId: id,
    position: index + 1,
    artist: `Artist ${id}`,
    name: `Track ${id}`,
    bpm: 124,
    energyScore: null,
    resolvedEnergy: energies ? energies[index] : null,
  }))
}

describe("diffVersions", () => {
  it("reports nothing changed when the order is the same", () => {
    // The common case, and it has to read as "you played your plan" rather than
    // as an empty screen.
    const diff = diffVersions(snapshot(["a", "b", "c"]), snapshot(["a", "b", "c"]))

    expect(diff.identical).toBe(true)
    expect(diff.unchangedCount).toBe(3)
    expect(diff.moved).toEqual([])
  })

  it("names the tracks that moved and how far", () => {
    const diff = diffVersions(
      snapshot(["a", "b", "c", "d"]),
      snapshot(["a", "d", "b", "c"])
    )

    expect(diff.identical).toBe(false)
    expect(diff.moved.map((track) => track.trackId)).toEqual(["d", "b", "c"])

    const d = diff.moved[0]
    expect(d.from).toBe(4)
    expect(d.to).toBe(2)
    expect(d.delta).toBe(-2)
  })

  it("puts the biggest movement first", () => {
    // A track that slid one slot is noise; one that jumped six is the story.
    const diff = diffVersions(
      snapshot(["a", "b", "c", "d", "e", "f", "g"]),
      snapshot(["g", "a", "c", "b", "d", "e", "f"])
    )

    expect(Math.abs(diff.moved[0].delta)).toBeGreaterThanOrEqual(
      Math.abs(diff.moved[diff.moved.length - 1].delta)
    )
    expect(diff.moved[0].trackId).toBe("g")
  })

  it("separates a skipped track from an unplanned one", () => {
    // The distinction the DJ cares about most: "I never played that" is a
    // different fact from "I threw that in".
    const diff = diffVersions(snapshot(["a", "b", "c"]), snapshot(["a", "c", "z"]))

    expect(diff.removed.map((track) => track.trackId)).toEqual(["b"])
    expect(diff.added.map((track) => track.trackId)).toEqual(["z"])
  })

  it("keeps the artist and title of a skipped track", () => {
    // The whole reason snapshots are self-contained: a track deleted from the
    // playlist has to stay nameable in the comparison.
    const diff = diffVersions(snapshot(["a", "b"]), snapshot(["a"]))

    expect(diff.removed[0].artist).toBe("Artist b")
    expect(diff.removed[0].name).toBe("Track b")
  })

  it("does not count added or removed tracks as moved", () => {
    const diff = diffVersions(snapshot(["a", "b"]), snapshot(["z", "a", "b"]))

    expect(diff.added.map((track) => track.trackId)).toEqual(["z"])
    // a and b both shifted down one, which is a real move.
    expect(diff.moved.map((track) => track.trackId)).toEqual(["a", "b"])
    expect(diff.moved.every((track) => track.delta === 1)).toBe(true)
  })

  it("exposes both curves when both versions recorded their energies", () => {
    const diff = diffVersions(
      snapshot(["a", "b", "c"], [5, 7, 9]),
      snapshot(["c", "b", "a"], [9, 7, 5])
    )

    expect(diff.curves).toEqual({ before: [5, 7, 9], after: [9, 7, 5] })
  })

  it("returns no curves rather than inventing one when energies are missing", () => {
    // A version captured before resolved energies existed has nulls throughout.
    // Zero-filling would draw a cliff to the floor that never happened.
    expect(diffVersions(snapshot(["a", "b"], [5, 7]), snapshot(["a", "b"])).curves)
      .toBeNull()
    expect(diffVersions(snapshot(["a", "b"]), snapshot(["a", "b"])).curves)
      .toBeNull()
  })

  it("handles a comparison against an empty side", () => {
    const diff = diffVersions(snapshot(["a", "b"]), snapshot([]))

    expect(diff.removed).toHaveLength(2)
    expect(diff.moved).toEqual([])
    expect(diff.curves).toBeNull()
  })
})

describe("scoreDelta", () => {
  it("reports the change in one decimal", () => {
    expect(scoreDelta(7.4, 6.9)).toBe(-0.5)
    expect(scoreDelta(6.8, 7.9)).toBe(1.1)
  })

  it("does not leak floating-point noise", () => {
    // 7.4 - 7.3 is 0.09999999999999964 in IEEE754, and that must never reach a UI.
    expect(scoreDelta(7.3, 7.4)).toBe(0.1)
  })

  it("is null when either side was never scored", () => {
    expect(scoreDelta(null, 7)).toBeNull()
    expect(scoreDelta(7, null)).toBeNull()
  })

  it("reports zero for no change, distinctly from unknown", () => {
    expect(scoreDelta(7, 7)).toBe(0)
  })
})

describe("curveDomain", () => {
  it("crops to the data so the difference is legible", () => {
    // Two sets living in the upper half shouldn't be squashed into a third of the
    // chart's height by a fixed 0–10 axis.
    const { min, max } = curveDomain([5.5, 6, 7, 8.5, 9])

    expect(min).toBeGreaterThan(4)
    expect(max).toBeLessThanOrEqual(10)
  })

  it("refuses to zoom tighter than the minimum span", () => {
    // The rule that keeps it honest: auto-scaling alone would magnify a 0.2
    // difference into a mountain range, which is how charts mislead.
    const { min, max } = curveDomain([7, 7.1, 7.2])

    expect(max - min).toBeGreaterThanOrEqual(MIN_CURVE_SPAN)
  })

  it("keeps a flat set flat instead of exploding it", () => {
    const { min, max } = curveDomain([7, 7, 7])

    expect(max - min).toBeGreaterThanOrEqual(MIN_CURVE_SPAN)
    expect(min).toBeLessThan(7)
    expect(max).toBeGreaterThan(7)
  })

  it("never leaves the 0–10 scale", () => {
    expect(curveDomain([0, 0.1]).min).toBe(0)
    expect(curveDomain([9.9, 10]).max).toBe(10)
  })

  it("falls back to the full scale for no data", () => {
    expect(curveDomain([])).toEqual({ min: 0, max: 10 })
  })
})
