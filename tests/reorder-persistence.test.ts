import { describe, expect, it } from "vitest"

import { finalPositions, isValidReorder } from "@/lib/tracklist/reorder"

describe("isValidReorder", () => {
  it("accepts a genuine permutation", () => {
    expect(isValidReorder(["a", "b", "c"], ["c", "a", "b"])).toBe(true)
    expect(isValidReorder(["a", "b", "c"], ["a", "b", "c"])).toBe(true)
  })

  it("rejects a different length", () => {
    expect(isValidReorder(["a", "b", "c"], ["a", "b"])).toBe(false)
  })

  it("rejects unknown ids", () => {
    expect(isValidReorder(["a", "b", "c"], ["a", "b", "x"])).toBe(false)
  })

  it("rejects duplicates in the requested order", () => {
    expect(isValidReorder(["a", "b", "c"], ["a", "a", "b"])).toBe(false)
  })
})

describe("finalPositions", () => {
  it("assigns contiguous 1..n positions in order", () => {
    expect(finalPositions(["c", "a", "b"])).toEqual([
      { id: "c", position: 1 },
      { id: "a", position: 2 },
      { id: "b", position: 3 },
    ])
  })

  it("produces a collision-free permutation of positions", () => {
    const ids = ["t1", "t2", "t3", "t4", "t5"]
    const positions = finalPositions(ids).map((p) => p.position)
    expect(new Set(positions).size).toBe(ids.length)
    expect(Math.min(...positions)).toBe(1)
    expect(Math.max(...positions)).toBe(ids.length)
  })
})
