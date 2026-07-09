import { describe, expect, it } from "vitest"

import {
  normalizeColumnPrefs,
  parseColumnPrefs,
} from "@/lib/tracklist/column-prefs"

describe("normalizeColumnPrefs", () => {
  it("keeps valid columns in canonical order and de-dupes", () => {
    expect(normalizeColumnPrefs(["comment", "genre", "genre"])).toEqual([
      "genre",
      "comment",
    ])
  })

  it("drops unknown values", () => {
    expect(normalizeColumnPrefs(["genre", "bogus", "bpm"])).toEqual(["genre"])
  })

  it("returns [] for non-arrays", () => {
    expect(normalizeColumnPrefs("genre")).toEqual([])
    expect(normalizeColumnPrefs(null)).toEqual([])
    expect(normalizeColumnPrefs(undefined)).toEqual([])
  })
})

describe("parseColumnPrefs", () => {
  it("parses a stored JSON array", () => {
    expect(parseColumnPrefs('["duration","genre"]')).toEqual([
      "genre",
      "duration",
    ])
  })

  it("returns [] for null or malformed JSON", () => {
    expect(parseColumnPrefs(null)).toEqual([])
    expect(parseColumnPrefs("garbage{")).toEqual([])
    expect(parseColumnPrefs("{}")).toEqual([])
  })
})
