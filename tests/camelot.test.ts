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

  it("converts Traktor Open Key notation (B16)", () => {
    // Same wheel rotated by 7: 1d = C major = 8B, 1m = A minor = 8A.
    expect(toCamelot("1d")).toBe("8B")
    expect(toCamelot("1m")).toBe("8A")
    expect(toCamelot("2d")).toBe("9B")
    expect(toCamelot("6d")).toBe("1B")
    expect(toCamelot("6m")).toBe("1A")
    expect(toCamelot("7m")).toBe("2A")
    expect(toCamelot("9d")).toBe("4B")
    expect(toCamelot("11m")).toBe("6A")
    expect(toCamelot("12m")).toBe("7A")
    expect(toCamelot("12d")).toBe("7B")
  })

  it("agrees with the musical lookup through Open Key", () => {
    // Open Key 11m is G minor; the musical table maps Gm → 6A.
    expect(toCamelot("11m")).toBe(toCamelot("Gm"))
    // Open Key 4d is A major; the musical table maps A → 11B.
    expect(toCamelot("4d")).toBe(toCamelot("A"))
  })

  it("keeps rejecting out-of-range Open Key values", () => {
    expect(toCamelot("13m")).toBeNull()
    expect(toCamelot("0d")).toBeNull()
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
