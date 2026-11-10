import { describe, expect, it } from "vitest"

import { analyzeExampleSet, EXAMPLE_PROBLEMS_SHOWN } from "@/lib/product/example-set-analysis"
import {
  EXAMPLE_SET_CONTEXT,
  EXAMPLE_SET_GENRE,
  EXAMPLE_SET_IS_PLACEHOLDER,
  EXAMPLE_SET_TRACKS,
} from "@/lib/product/example-set"
import { SET_CONTEXTS, SUPPORTED_GENRES } from "@/lib/product/strategy"

/**
 * The dashboard's example set (docs/conversion-plan.md, step 1.1).
 *
 * The rows are meant to be replaced with a real set (see the comment at the top
 * of lib/product/example-set.ts), so these tests check what any replacement must
 * keep: values a real set could have, and an engine read worth showing. They
 * don't pin today's numbers — pinning them would break on the replacement and
 * teach nothing.
 */

describe("the example set's rows", () => {
  it("are a set's worth of tracks", () => {
    expect(EXAMPLE_SET_TRACKS.length).toBeGreaterThanOrEqual(8)
    expect(EXAMPLE_SET_TRACKS.length).toBeLessThanOrEqual(30)
    expect(SUPPORTED_GENRES).toContain(EXAMPLE_SET_GENRE)
    expect(SET_CONTEXTS).toContain(EXAMPLE_SET_CONTEXT)
  })

  it("carry values a real set could have — a fantasy curve teaches something false", () => {
    for (const track of EXAMPLE_SET_TRACKS) {
      if (track.bpm !== null) expect(track.bpm).toBeGreaterThanOrEqual(60)
      if (track.bpm !== null) expect(track.bpm).toBeLessThanOrEqual(200)
      if (track.energy !== null) expect(track.energy).toBeGreaterThanOrEqual(1)
      if (track.energy !== null) expect(track.energy).toBeLessThanOrEqual(10)
      if (track.key !== null) expect(track.key).toMatch(/^(1[0-2]|[1-9])[AB]$/)
      if (track.durationSeconds !== null) expect(track.durationSeconds).toBeGreaterThanOrEqual(120)
      if (track.durationSeconds !== null) expect(track.durationSeconds).toBeLessThanOrEqual(900)
    }
  })

  it("while it is the placeholder, names nobody: generic names, no real artist", () => {
    if (!EXAMPLE_SET_IS_PLACEHOLDER) return
    for (const track of EXAMPLE_SET_TRACKS) {
      expect(track.artist).toBe("Example artist")
      expect(track.name).toMatch(/^Example track \d+$/)
    }
  })
})

describe("the example set, read by the engine", () => {
  const es = analyzeExampleSet("es")
  const en = analyzeExampleSet("en")

  it("draws one point per track, against a target of the same length", () => {
    expect(es.curve).toHaveLength(EXAMPLE_SET_TRACKS.length)
    expect(es.targetCurve).toHaveLength(EXAMPLE_SET_TRACKS.length)
    expect(es.trackCount).toBe(EXAMPLE_SET_TRACKS.length)
  })

  it("finds something to fix, and isn't a perfect score — that would teach nothing", () => {
    expect(es.problems.length).toBeGreaterThan(0)
    expect(es.problems.length).toBeLessThanOrEqual(EXAMPLE_PROBLEMS_SHOWN)
    expect(es.score).toBeGreaterThanOrEqual(1)
    expect(es.score).toBeLessThan(9.5)
  })

  it("says the same in both languages, in each one's words", () => {
    expect(en.score).toBe(es.score)
    expect(en.problems).toHaveLength(es.problems.length)
    expect(en.problems[0].title).not.toBe(es.problems[0].title)
  })

  it("counts the findings it doesn't spell out", () => {
    expect(es.moreProblems).toBeGreaterThanOrEqual(0)
  })
})
