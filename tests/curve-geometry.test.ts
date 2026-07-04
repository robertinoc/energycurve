import { describe, expect, it } from "vitest"

import {
  buildCurveAreaPath,
  buildSmoothCurvePath,
  mapValuesToCurvePoints,
} from "@/lib/charts/curve-geometry"

describe("mapValuesToCurvePoints", () => {
  it("maps the 1-10 energy domain onto the drawing area", () => {
    const points = mapValuesToCurvePoints([1, 10], 100, 100, 10, {
      min: 1,
      max: 10,
    })

    // Min value sits at the bottom of the inner area, max at the top.
    expect(points[0]).toEqual({ x: 10, y: 90 })
    expect(points[1]).toEqual({ x: 90, y: 10 })
  })

  it("keeps the legacy 0-100 domain behavior", () => {
    const points = mapValuesToCurvePoints([50], 100, 100, 10, {
      min: 0,
      max: 100,
    })

    expect(points[0].y).toBe(50)
  })

  it("centers a single point horizontally at the left padding", () => {
    const points = mapValuesToCurvePoints([5], 200, 100, 20, {
      min: 1,
      max: 10,
    })

    expect(points).toHaveLength(1)
    expect(points[0].x).toBe(20)
  })

  it("returns an empty array for empty input", () => {
    expect(mapValuesToCurvePoints([], 100, 100)).toEqual([])
  })
})

describe("buildSmoothCurvePath", () => {
  it("returns an empty string for no points", () => {
    expect(buildSmoothCurvePath([])).toBe("")
  })

  it("returns a bare move for a single point", () => {
    expect(buildSmoothCurvePath([{ x: 5, y: 6 }])).toBe("M 5 6")
  })

  it("starts with M and contains quadratic segments for multiple points", () => {
    const path = buildSmoothCurvePath([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ])

    expect(path.startsWith("M 0 0")).toBe(true)
    expect(path).toContain(" Q ")
  })
})

describe("buildCurveAreaPath", () => {
  it("closes the shape down to the baseline", () => {
    const path = buildCurveAreaPath(
      [
        { x: 10, y: 20 },
        { x: 90, y: 40 },
      ],
      100,
      100,
      10
    )

    expect(path).toContain("L 90 90")
    expect(path).toContain("L 10 90")
    expect(path.endsWith("Z")).toBe(true)
  })

  it("returns an empty string for no points", () => {
    expect(buildCurveAreaPath([], 100, 100)).toBe("")
  })
})
