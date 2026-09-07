import { describe, expect, it } from "vitest"

import {
  coverageStatus,
  coverageWorthExplaining,
  formatCannotCarry,
  formatIsLimited,
  importCoverage,
  type CoverageTrack,
} from "@/lib/playlists/import-coverage"

function track(overrides: Partial<CoverageTrack> = {}): CoverageTrack {
  return {
    bpm: null,
    musicalKey: null,
    genre: null,
    energyScore: null,
    durationSeconds: null,
    energySource: null,
    ...overrides,
  }
}

describe("importCoverage", () => {
  it("counts what came through per field", () => {
    const coverage = importCoverage([
      track({ bpm: 130, musicalKey: "9A", energyScore: 7, energySource: "comment" }),
      track({ bpm: 128, durationSeconds: 300 }),
      track(),
    ])

    expect(coverage.tracks).toBe(3)
    expect(coverage.counts).toEqual({
      bpm: 2,
      key: 1,
      genre: 0,
      energy: 1,
      duration: 1,
    })
  })

  it("reports which tags the energy came from, most common first", () => {
    const coverage = importCoverage([
      track({ energyScore: 7, energySource: "comment" }),
      track({ energyScore: 5, energySource: "grouping" }),
      track({ energyScore: 6, energySource: "comment" }),
      // No energy, so its source doesn't count even if one is set.
      track({ energySource: "lyrics" }),
    ])

    expect(coverage.energyFields).toEqual([
      { field: "comment", count: 2 },
      { field: "grouping", count: 1 },
    ])
  })

  it("handles an empty playlist", () => {
    const coverage = importCoverage([])
    expect(coverage.tracks).toBe(0)
    expect(coverage.energyFields).toEqual([])
  })
})

describe("coverageStatus", () => {
  const full = importCoverage([
    track({ bpm: 130, musicalKey: "9A", genre: "Techno", energyScore: 7, durationSeconds: 300 }),
  ])
  const empty = importCoverage([track({ durationSeconds: 300 })])

  it("distinguishes full, partial and none", () => {
    expect(coverageStatus(full, "bpm", "traktor")).toBe("full")
    expect(coverageStatus(empty, "bpm", "traktor")).toBe("none")
    expect(
      coverageStatus(
        importCoverage([track({ bpm: 130 }), track()]),
        "bpm",
        "traktor"
      )
    ).toBe("partial")
  })

  it("says 'not in this format' rather than 'none' for m3u8", () => {
    // The difference the user's report turned on: an m3u8 with no BPM is not a
    // library with no BPM, and telling him to fix his tags would have been
    // wrong advice.
    expect(coverageStatus(empty, "bpm", "m3u8")).toBe("unsupported")
    expect(coverageStatus(empty, "key", "m3u8")).toBe("unsupported")
    expect(coverageStatus(empty, "genre", "m3u8")).toBe("unsupported")
    expect(coverageStatus(empty, "energy", "m3u8")).toBe("unsupported")
    // Duration IS in the format, so an absence there is a real absence.
    expect(coverageStatus(importCoverage([track()]), "duration", "m3u8")).toBe(
      "none"
    )
  })

  it("does not claim a format is limited when it isn't", () => {
    expect(formatCannotCarry("traktor", "energy")).toBe(false)
    expect(formatCannotCarry("rekordbox", "key")).toBe(false)
    expect(formatCannotCarry("files", "bpm")).toBe(false)
    expect(formatCannotCarry(null, "bpm")).toBe(false)

    expect(formatIsLimited("m3u8")).toBe(true)
    expect(formatIsLimited("traktor")).toBe(false)
    expect(formatIsLimited(null)).toBe(false)
  })
})

describe("coverageWorthExplaining", () => {
  it("is quiet when the import was complete", () => {
    expect(
      coverageWorthExplaining(
        importCoverage([track({ bpm: 130, energyScore: 7 })])
      )
    ).toBe(false)
  })

  it("speaks up when BPM or energy is incomplete", () => {
    expect(
      coverageWorthExplaining(importCoverage([track({ bpm: 130 })]))
    ).toBe(true)
    expect(
      coverageWorthExplaining(importCoverage([track({ energyScore: 7 })]))
    ).toBe(true)
  })

  it("has nothing to say about an empty playlist", () => {
    expect(coverageWorthExplaining(importCoverage([]))).toBe(false)
  })
})
