import { describe, expect, it } from "vitest"

import { compareSets, trackKey } from "@/lib/playlists/set-comparison"

const set = (entries: readonly [string, string][]) =>
  entries.map(([artist, name], index) => ({
    artist,
    name,
    position: index + 1,
  }))

describe("trackKey", () => {
  it("treats the same record written differently as the same record", () => {
    expect(trackKey("Nu Zau", "Cuando")).toBe(
      trackKey("nu  zau", "  CUANDO ")
    )
  })

  it("ignores accents", () => {
    // "Sí" and "Si" are the same track typed twice.
    expect(trackKey("Rodríguez Jr.", "Sí")).toBe(trackKey("Rodriguez Jr", "Si"))
  })

  it("drops suffixes that don't change which record it is", () => {
    const base = trackKey("Trikk", "Ondas")

    expect(trackKey("Trikk", "Ondas (Original Mix)")).toBe(base)
    expect(trackKey("Trikk", "Ondas - Radio Edit")).toBe(base)
  })

  it("keeps remixes distinct, because a DJ chooses between them", () => {
    // The conservative direction: missing a repeat is a gap in a warning,
    // claiming two different records are the same is a wrong accusation.
    expect(trackKey("Trikk", "Ondas (Extended Mix)")).not.toBe(
      trackKey("Trikk", "Ondas")
    )
    expect(trackKey("Trikk", "Ondas (Mathame Remix)")).not.toBe(
      trackKey("Trikk", "Ondas")
    )
  })

  it("keeps different artists apart even with the same title", () => {
    expect(trackKey("A", "Gravity")).not.toBe(trackKey("B", "Gravity"))
  })
})

describe("compareSets", () => {
  const friday = set([
    ["Nu Zau", "Cuando"],
    ["Trikk", "Ondas"],
    ["Massano", "The Feeling"],
  ])

  it("finds shared tracks and reports where each landed", () => {
    // "Early on Friday, late on Saturday" is the useful part — the same record
    // in a different role is not the same repetition problem.
    const saturday = set([
      ["Innellea", "The Belonging"],
      ["Massano", "The Feeling (Original Mix)"],
    ])

    const result = compareSets(friday, saturday)

    expect(result.shared).toHaveLength(1)
    expect(result.shared[0].positionA).toBe(3)
    expect(result.shared[0].positionB).toBe(2)
  })

  it("lists what belongs to only one side", () => {
    const result = compareSets(friday, set([["Trikk", "Ondas"]]))

    expect(result.onlyInA.map((t) => t.name).sort()).toEqual([
      "Cuando",
      "The Feeling",
    ])
    expect(result.onlyInB).toEqual([])
  })

  it("measures overlap against the smaller set", () => {
    // Two of two shared is a full repeat, whatever the other set's length —
    // dividing by the union would hide exactly that.
    const short = set([
      ["Nu Zau", "Cuando"],
      ["Trikk", "Ondas"],
    ])

    expect(compareSets(friday, short).overlapRatio).toBe(1)
  })

  it("reports no overlap for disjoint sets", () => {
    const result = compareSets(friday, set([["Kiasmos", "Blurred"]]))

    expect(result.shared).toEqual([])
    expect(result.overlapRatio).toBe(0)
  })

  it("counts a record played twice in one set only once", () => {
    const repeated = set([
      ["Trikk", "Ondas"],
      ["Trikk", "Ondas (Original Mix)"],
    ])

    const result = compareSets(repeated, set([["Trikk", "Ondas"]]))

    expect(result.shared).toHaveLength(1)
    // The earlier position is the one that matters for "when did this land".
    expect(result.shared[0].positionA).toBe(1)
  })

  it("handles an empty set without dividing by zero", () => {
    expect(compareSets(friday, []).overlapRatio).toBe(0)
    expect(compareSets([], []).shared).toEqual([])
  })

  it("orders shared tracks by where they fall in the first set", () => {
    const other = set([
      ["Massano", "The Feeling"],
      ["Nu Zau", "Cuando"],
    ])

    expect(compareSets(friday, other).shared.map((t) => t.positionA)).toEqual([
      1, 3,
    ])
  })
})
