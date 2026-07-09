import { describe, expect, it } from "vitest"

import { isCamelot, toCamelot } from "@/lib/music/camelot"

describe("toCamelot", () => {
  it("maps minor keys to the A ring", () => {
    expect(toCamelot("Am")).toBe("8A")
    expect(toCamelot("Bm")).toBe("10A")
    expect(toCamelot("F#m")).toBe("11A")
    expect(toCamelot("Bbm")).toBe("3A")
    expect(toCamelot("Ebm")).toBe("2A")
    expect(toCamelot("Abm")).toBe("1A")
  })

  it("maps major keys to the B ring", () => {
    expect(toCamelot("C")).toBe("8B")
    expect(toCamelot("G")).toBe("9B")
    expect(toCamelot("E")).toBe("12B")
    expect(toCamelot("Bb")).toBe("6B")
  })

  it("handles enharmonic spellings", () => {
    expect(toCamelot("G#m")).toBe("1A")
    expect(toCamelot("Gbm")).toBe("11A")
    expect(toCamelot("Db")).toBe("3B")
  })

  it("normalizes verbose notations", () => {
    expect(toCamelot("A minor")).toBe("8A")
    expect(toCamelot("A maj")).toBe("11B")
    expect(toCamelot(" bm ")).toBe("10A")
  })

  it("passes through values already in Camelot notation", () => {
    expect(toCamelot("8A")).toBe("8A")
    expect(toCamelot("12b")).toBe("12B")
  })

  it("returns null for empty or unrecognized keys", () => {
    expect(toCamelot(null)).toBeNull()
    expect(toCamelot(undefined)).toBeNull()
    expect(toCamelot("")).toBeNull()
    expect(toCamelot("nonsense")).toBeNull()
  })
})

describe("isCamelot", () => {
  it("recognizes valid Camelot codes", () => {
    expect(isCamelot("1A")).toBe(true)
    expect(isCamelot("12B")).toBe(true)
    expect(isCamelot("8a")).toBe(true)
  })

  it("rejects musical keys and out-of-range codes", () => {
    expect(isCamelot("Am")).toBe(false)
    expect(isCamelot("13A")).toBe(false)
    expect(isCamelot("0B")).toBe(false)
  })
})
