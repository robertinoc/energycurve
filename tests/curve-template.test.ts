import { describe, expect, it } from "vitest"

import {
  anchorsFromCurve,
  normaliseTemplateName,
  parseAnchors,
  TEMPLATE_ANCHOR_COUNT,
} from "@/lib/playlists/curve-template"

describe("anchorsFromCurve", () => {
  it("keeps the start and the end of the night", () => {
    const anchors = anchorsFromCurve([3, 5, 7, 9, 8, 6])

    expect(anchors[0][0]).toBe(0)
    expect(anchors[0][1]).toBe(3)
    expect(anchors[anchors.length - 1][0]).toBe(1)
    expect(anchors[anchors.length - 1][1]).toBe(6)
  })

  it("reduces a long set to a handful of anchors", () => {
    // Enough to hold a build, a dip and a second build; few enough that it
    // describes an intention rather than one night's noise.
    const long = Array.from({ length: 40 }, (_, i) => 3 + (i / 39) * 6)

    expect(anchorsFromCurve(long)).toHaveLength(TEMPLATE_ANCHOR_COUNT)
  })

  it("never invents more anchors than the set has tracks", () => {
    expect(anchorsFromCurve([4, 6, 8])).toHaveLength(3)
  })

  it("preserves the shape's direction", () => {
    const rising = anchorsFromCurve([2, 4, 6, 8, 10])

    for (let i = 1; i < rising.length; i += 1) {
      expect(rising[i][1]).toBeGreaterThan(rising[i - 1][1])
    }
  })

  it("keeps a mid-set dip rather than smoothing it away", () => {
    // The dip is the whole reason somebody saves a journey shape.
    const anchors = anchorsFromCurve([5, 8, 5.5, 8, 9.5])
    const energies = anchors.map(([, energy]) => energy)

    expect(Math.min(...energies)).toBeLessThan(energies[1])
  })

  it("handles a single-track set without producing an unusable shape", () => {
    // Two anchors, so the sampler still has a segment to walk.
    expect(anchorsFromCurve([7])).toEqual([
      [0, 7],
      [1, 7],
    ])
  })

  it("returns nothing for an empty set", () => {
    expect(anchorsFromCurve([])).toEqual([])
  })
})

describe("parseAnchors", () => {
  it("reads a well-formed template", () => {
    expect(
      parseAnchors([
        [0, 3],
        [0.5, 7],
        [1, 9],
      ])
    ).toHaveLength(3)
  })

  it("refuses anything malformed rather than half-reading it", () => {
    // A template that half-parses would silently score a set against a shape
    // nobody designed — worse than saying it's broken.
    for (const bad of [
      null,
      "nope",
      [],
      [[0, 3]], // a single point isn't a shape
      [[0, 3], [1]],
      [[0, 3], ["1", 9]],
      [[0, 3], [1, 99]], // outside the energy scale
      [[0, 3], [2, 9]], // outside the progress range
      [[0, 3], [Number.NaN, 9]],
    ]) {
      expect(parseAnchors(bad), JSON.stringify(bad)).toBeNull()
    }
  })

  it("refuses anchors that go backwards", () => {
    // The sampler walks these in order; a backwards step makes it read the
    // wrong segment and silently produce a different shape.
    expect(
      parseAnchors([
        [0, 3],
        [0.8, 9],
        [0.4, 5],
      ])
    ).toBeNull()
  })
})

describe("normaliseTemplateName", () => {
  it("trims and collapses whitespace", () => {
    expect(normaliseTemplateName("  my   warm  up ")).toBe("my warm up")
  })

  it("rejects empty and oversized names", () => {
    expect(normaliseTemplateName("   ")).toBeNull()
    expect(normaliseTemplateName("x".repeat(61))).toBeNull()
    expect(normaliseTemplateName("x".repeat(60))).not.toBeNull()
  })
})
