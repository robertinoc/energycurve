import { describe, expect, it } from "vitest"

import { analyzePlaylist, computeSetScore } from "@/lib/engine/analysis"
import { buildTargetCurve } from "@/lib/engine/target-curve"
import { CURVE_SHAPES, CURVE_SHAPE_ANCHORS } from "@/lib/product/strategy"

describe("buildTargetCurve — named shapes", () => {
  it("keeps the derived target when no shape is declared", () => {
    // The guarantee that lets this ship without moving anybody's score.
    expect(buildTargetCurve(10, "main", "house")).toEqual(
      buildTargetCurve(10, "main", "house", null)
    )
  })

  it("overrides the derived target when a shape is declared", () => {
    expect(buildTargetCurve(10, "main", "house", "after_hours")).not.toEqual(
      buildTargetCurve(10, "main", "house")
    )
  })

  it("ignores genre and context once a shape is declared", () => {
    // The DJ saying what they play beats our inference from two tags — and if
    // genre still leaked in, "after-hours" would mean something different per
    // genre, which is not a promise anyone could reason about.
    const houseOpening = buildTargetCurve(12, "opening", "house", "journey")
    const technoClosing = buildTargetCurve(12, "closing", "hard-techno", "journey")

    expect(houseOpening).toEqual(technoClosing)
  })

  it("starts and ends on each shape's own anchors", () => {
    for (const shape of CURVE_SHAPES) {
      const anchors = CURVE_SHAPE_ANCHORS[shape]
      const curve = buildTargetCurve(20, "main", "house", shape)

      expect(curve[0], `${shape} start`).toBeCloseTo(anchors[0][1], 1)
      expect(curve[curve.length - 1], `${shape} end`).toBeCloseTo(
        anchors[anchors.length - 1][1],
        1
      )
    }
  })

  it("stays inside the 0–10 energy scale for every shape and length", () => {
    for (const shape of CURVE_SHAPES) {
      for (const length of [1, 2, 7, 40]) {
        for (const energy of buildTargetCurve(length, "main", "house", shape)) {
          expect(energy, `${shape} @ ${length}`).toBeGreaterThanOrEqual(0)
          expect(energy, `${shape} @ ${length}`).toBeLessThanOrEqual(10)
        }
      }
    }
  })

  it("samples the midpoint for a single-track set, like the derived target", () => {
    expect(buildTargetCurve(1, "main", "house", "warm_up")).toHaveLength(1)
  })

  it("never peaks in warm-up, and always tops out in peak time", () => {
    const warmUp = buildTargetCurve(16, "main", "house", "warm_up")
    const peakTime = buildTargetCurve(16, "main", "house", "peak_time")

    expect(Math.max(...warmUp)).toBeLessThan(7)
    expect(Math.max(...peakTime)).toBeGreaterThanOrEqual(9)
  })

  it("comes down at the end of a landing, and holds up at the end of peak time", () => {
    const landing = buildTargetCurve(16, "main", "house", "landing")
    const peakTime = buildTargetCurve(16, "main", "house", "peak_time")

    expect(landing[15]).toBeLessThan(landing[4])
    expect(peakTime[15]).toBeGreaterThanOrEqual(peakTime[8])
  })

  it("dips mid-set in a journey and recovers higher", () => {
    const journey = buildTargetCurve(20, "main", "house", "journey")
    const first = journey.slice(0, 9)
    const dip = Math.min(...journey.slice(9, 13))

    expect(dip).toBeLessThan(Math.max(...first))
    expect(Math.max(...journey.slice(13))).toBeGreaterThan(Math.max(...first))
  })
})

describe("scoring against a declared shape", () => {
  /** A set that holds one energy for its whole length. */
  const plateau = Array.from({ length: 14 }, () => 8.5)

  it("rewards a flat after-hours set that the derived target would punish", () => {
    // The payoff. Against a `main` target the plateau reads as no climax plus a
    // long monotony penalty; declared as after-hours it is the correct set.
    const derived = computeSetScore(plateau, "melodic-techno", "main")
    const declared = computeSetScore(
      plateau,
      "melodic-techno",
      "main",
      undefined,
      "after_hours"
    )

    expect(declared).toBeGreaterThan(derived)
  })

  it("charges nothing to a set that actually rides its declared shape", () => {
    // The set IS the shape, ramp-in included. Worth stating precisely: a curve
    // that sits flat at the ceiling from track one is *not* an after-hours set —
    // the shape asks for a 20% ramp — and the engine is right to say so. The
    // exemption is for riding the plateau, not for ignoring the entrance.
    const rides = buildTargetCurve(14, "main", "melodic-techno", "after_hours")
    const analysis = analyzePlaylist({
      curve: rides,
      genre: "melodic-techno",
      context: "main",
      targetShape: "after_hours",
    })

    expect(
      analysis.issues.filter((issue) => issue.penaltyApplied > 0)
    ).toEqual([])
  })

  it("exempts the long plateau from the monotony penalty", () => {
    // Not a new rule: the flat-zone check already forgives a set riding a flat
    // target. Declaring the shape is what makes the target flat — which is why
    // eleven identical tracks in the middle cost nothing here and would cost
    // real points against a climbing target.
    const rides = buildTargetCurve(14, "main", "melodic-techno", "after_hours")

    const declared = analyzePlaylist({
      curve: rides,
      genre: "melodic-techno",
      context: "main",
      targetShape: "after_hours",
    })
    const derived = analyzePlaylist({
      curve: rides,
      genre: "melodic-techno",
      context: "main",
    })

    const flatPenalty = (analysis: typeof declared) =>
      analysis.issues
        .filter((issue) => issue.type === "flat_zone")
        .reduce((total, issue) => total + issue.penaltyApplied, 0)

    expect(flatPenalty(declared)).toBe(0)
    expect(flatPenalty(derived)).toBeGreaterThan(0)
  })

  it("rewards a descending set once it is declared a landing", () => {
    const descending = [7.5, 8.5, 9, 8.6, 8, 7.4, 7, 6.4, 6, 5.5]

    expect(
      computeSetScore(descending, "house", "closing", undefined, "landing")
    ).toBeGreaterThan(computeSetScore(descending, "house", "closing"))
  })

  it("still punishes a set that ignores the shape it declared", () => {
    // A shape is a claim, not an exemption: declaring warm-up and then peaking
    // has to score worse than declaring warm-up and staying low.
    const peaks = [3, 5, 7, 9.5, 9.5, 8, 6, 4]
    const stayed = [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5]

    expect(
      computeSetScore(peaks, "house", "opening", undefined, "warm_up")
    ).toBeLessThan(computeSetScore(stayed, "house", "opening", undefined, "warm_up"))
  })

  it("reports the shape it scored against", () => {
    expect(
      analyzePlaylist({
        curve: plateau,
        genre: "house",
        context: "main",
        targetShape: "after_hours",
      }).targetShape
    ).toBe("after_hours")

    expect(
      analyzePlaylist({ curve: plateau, genre: "house", context: "main" }).targetShape
    ).toBeNull()
  })
})
