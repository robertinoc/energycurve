import { describe, expect, it } from "vitest"

import { buildTargetCurve } from "@/lib/engine/target-curve"

describe("buildTargetCurve", () => {
  it("opening ramps 3 → 6 for standard genres", () => {
    const curve = buildTargetCurve(4, "opening", "house")

    expect(curve[0]).toBe(3)
    expect(curve[curve.length - 1]).toBe(6)
    expect(curve).toEqual([...curve].sort((a, b) => a - b))
  })

  it("opening ends lower for slow-build genres", () => {
    const curve = buildTargetCurve(4, "opening", "progressive")

    expect(curve[0]).toBe(3)
    expect(curve[curve.length - 1]).toBe(5.5)
  })

  it("main ramps to the peak and holds it", () => {
    const curve = buildTargetCurve(11, "main", "house")

    expect(curve[0]).toBe(6)
    // Climax at 70% of the set (index 7 of 0..10), held to the end.
    expect(curve[7]).toBe(9)
    expect(curve[10]).toBe(9)
    expect(Math.max(...curve)).toBe(9)
  })

  it("main for driving genres starts higher and peaks higher", () => {
    const curve = buildTargetCurve(11, "main", "hard-techno")

    expect(curve[0]).toBe(7)
    expect(Math.max(...curve)).toBe(9.5)
    expect(curve[10]).toBe(9.5)
  })

  it("closing holds a high plateau", () => {
    const curve = buildTargetCurve(11, "closing", "techno")

    expect(curve[0]).toBe(7)
    expect(curve[10]).toBe(9)
    expect(Math.max(...curve)).toBe(9)
  })

  it("closing soft-landing genres descend at the very end", () => {
    const curve = buildTargetCurve(21, "closing", "progressive")
    const peak = Math.max(...curve)

    expect(curve[curve.length - 1]).toBeLessThan(peak)
    expect(curve[curve.length - 1]).toBeGreaterThanOrEqual(peak - 1)
  })

  it("is length-invariant at the endpoints", () => {
    const short = buildTargetCurve(6, "opening", "house")
    const long = buildTargetCurve(24, "opening", "house")

    expect(short[0]).toBe(long[0])
    expect(short[short.length - 1]).toBe(long[long.length - 1])
  })

  it("samples the midpoint for a single track", () => {
    expect(buildTargetCurve(1, "opening", "house")).toEqual([4.5])
  })

  it("returns an empty curve for zero tracks", () => {
    expect(buildTargetCurve(0, "main", "house")).toEqual([])
  })
})
